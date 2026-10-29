package com.example.backend.business;

import com.example.backend.entity.Game;
import com.example.backend.entity.GamePlayer;
import com.example.backend.entity.Order;
import com.example.backend.entity.User;
import com.example.backend.repository.OrderRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest
class OrderRepositoryExpiredStatusTest {

    @Autowired
    private TestEntityManager em;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private com.example.backend.repository.UserRepository userRepository;

    private User renter;
    private GamePlayer player;

    @BeforeEach
    void setUp() {
        renter = persistUser("renter");
        User playerUser = persistUser("idol");

        Game game = new Game();
        game.setName("LoL");
        game.setDescription("MOBA");
        game.setCategory("MOBA");
        game.setPlatform("PC");
        game.setStatus("ACTIVE");
        game.setHasRoles(false);
        em.persist(game);

        player = new GamePlayer();
        player.setUser(playerUser);
        player.setGame(game);
        player.setUsername("idol");
        player.setRank("Gold");
        player.setServer("VN");
        player.setPricePerHour(BigDecimal.valueOf(50000));
        player.setStatus("AVAILABLE");
        em.persist(player);
    }

    private User persistUser(String name) {
        User u = new User();
        u.setUsername(name);
        u.setPassword("x");
        u.setEmail(name + "@test.local");
        em.persist(u);
        return u;
    }

    private Order persistOrder(String status, long price, LocalDateTime createdAt) {
        Order o = new Order();
        o.setRenter(renter);
        o.setPlayer(player);
        o.setStatus(status);
        o.setPrice(price);
        o.setStartTime(LocalDateTime.now().plusDays(1));
        o.setEndTime(LocalDateTime.now().plusDays(1).plusHours(2));
        o.setCreatedAt(createdAt);
        return em.persistAndFlush(o);
    }

    @Test
    @DisplayName("Thống kê toàn hệ thống: EXPIRED được đếm vào cột đơn hủy, không vào doanh thu")
    void globalStatsCountExpiredAsCanceled() {
        LocalDateTime now = LocalDateTime.now();
        persistOrder("COMPLETED", 100000, now);
        persistOrder("CANCELED", 50000, now);
        persistOrder("EXPIRED", 70000, now);
        persistOrder("PENDING", 30000, now);

        Object[] row = orderRepository.getGlobalAggregatedOrderStats().get(0);
        assertEquals(4L, ((Number) row[0]).longValue(), "tổng đơn");
        assertEquals(1L, ((Number) row[1]).longValue(), "đơn hoàn thành");
        assertEquals(2L, ((Number) row[2]).longValue(), "đơn hủy phải gồm CANCELED + EXPIRED");
        assertEquals(1L, ((Number) row[4]).longValue(), "đơn chờ xác nhận");
        assertEquals(100000L, ((Number) row[5]).longValue(), "doanh thu chỉ tính đơn COMPLETED");
    }

    @Test
    @DisplayName("Số đơn hủy của player gồm CANCELED, REJECTED và EXPIRED")
    void playerCanceledCountIncludesExpired() {
        LocalDateTime now = LocalDateTime.now();
        persistOrder("CANCELED", 1000, now);
        persistOrder("REJECTED", 1000, now);
        persistOrder("EXPIRED", 1000, now);
        persistOrder("COMPLETED", 1000, now);

        assertEquals(3L, orderRepository.countCanceledOrdersByPlayerId(player.getId()));
    }

    @Test
    @DisplayName("Thống kê hoa hồng và chi tiêu của người thuê không tính đơn EXPIRED")
    void validOrdersAndRenterSpendExcludeExpired() {
        LocalDateTime now = LocalDateTime.now();
        persistOrder("COMPLETED", 100000, now);
        persistOrder("EXPIRED", 900000, now);
        persistOrder("CANCELED", 800000, now);

        List<Order> valid = orderRepository.findValidOrdersForCommission();
        assertEquals(1, valid.size());
        assertEquals("COMPLETED", valid.get(0).getStatus());

        List<Object[]> spent = orderRepository.sumHireSpentByRenters();
        assertEquals(1, spent.size());
        assertEquals(renter.getId(), ((Number) spent.get(0)[0]).longValue());
        assertEquals(100000L, ((Number) spent.get(0)[1]).longValue(), "đơn EXPIRED không được cộng vào chi tiêu");
    }

    @Test
    @DisplayName("Đơn EXPIRED không chặn lịch của player (không bị coi là trùng lịch)")
    void expiredOrderDoesNotBlockSchedule() {
        Order expired = persistOrder("EXPIRED", 1000, LocalDateTime.now());
        Order pending = persistOrder("PENDING", 1000, LocalDateTime.now());

        List<Order> overlapping = orderRepository.findOverlappingOrders(
                player.getId(), expired.getStartTime().minusMinutes(10), expired.getEndTime().plusMinutes(10));

        assertEquals(1, overlapping.size());
        assertEquals(pending.getId(), overlapping.get(0).getId());
    }

    @Test
    @DisplayName("Chỉ đơn PENDING quá hạn mới bị quét để tự hủy")
    void findPendingOrdersCreatedBeforeOnlyReturnsStalePending() {
        LocalDateTime now = LocalDateTime.now();
        Order stale = persistOrder("PENDING", 1000, now.minusMinutes(30));
        persistOrder("PENDING", 1000, now.minusMinutes(2));
        persistOrder("EXPIRED", 1000, now.minusMinutes(60));
        persistOrder("CONFIRMED", 1000, now.minusMinutes(60));

        List<Order> found = orderRepository.findPendingOrdersCreatedBefore(now.minusMinutes(15));

        assertEquals(1, found.size());
        assertEquals(stale.getId(), found.get(0).getId());
    }

    @Test
    @DisplayName("updateActivity chỉ ghi trạng thái online, không động tới coin (chống ghi đè số dư)")
    void updateActivityDoesNotTouchCoin() {
        renter.setCoin(100000L);
        em.persistAndFlush(renter);
        // Giả lập số dư được cộng bởi luồng khác trong lúc user đang gửi request
        userRepository.addCoinSafely(renter.getId(), 50000L);
        LocalDateTime now = LocalDateTime.now();

        userRepository.updateActivity(renter.getId(), true, now);

        em.clear();
        User reloaded = userRepository.findById(renter.getId()).orElseThrow();
        assertEquals(150000L, reloaded.getCoin());
        assertTrue(reloaded.getIsOnline());
        assertNotNull(reloaded.getLastActiveAt());
    }

    @Test
    @DisplayName("markOrderExpiredIfPending: chỉ cập nhật 1 lần, đơn đã đổi trạng thái thì trả về 0 (chống hoàn tiền hai lần)")
    void markOrderExpiredIfPendingIsAtomic() {
        Order pending = persistOrder("PENDING", 100000, LocalDateTime.now().minusMinutes(30));
        Order confirmed = persistOrder("CONFIRMED", 100000, LocalDateTime.now().minusMinutes(30));

        assertEquals(1, orderRepository.markOrderExpiredIfPending(pending.getId(), "hết hạn"));
        assertEquals(0, orderRepository.markOrderExpiredIfPending(pending.getId(), "hết hạn"),
                "lần gọi thứ hai không được cập nhật nữa");
        assertEquals(0, orderRepository.markOrderExpiredIfPending(confirmed.getId(), "hết hạn"),
                "đơn đã CONFIRMED không được chuyển sang EXPIRED");

        em.clear();
        Order reloaded = orderRepository.findById(pending.getId()).orElseThrow();
        assertEquals("EXPIRED", reloaded.getStatus());
        assertEquals("REFUNDED", reloaded.getPayoutStatus());
        assertEquals("hết hạn", reloaded.getCancellationReason());
        assertEquals("CONFIRMED", orderRepository.findById(confirmed.getId()).orElseThrow().getStatus());
    }
}

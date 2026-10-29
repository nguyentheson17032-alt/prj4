package com.example.backend.financial;

import com.example.backend.dto.PlayerIncomeReportDTO;
import com.example.backend.entity.GamePlayer;
import com.example.backend.entity.Order;
import com.example.backend.entity.Payment;
import com.example.backend.entity.User;
import com.example.backend.repository.OrderRepository;
import com.example.backend.repository.PaymentRepository;
import com.example.backend.service.PlayerIncomeReportService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
public class PlayerIncomeReportServiceTest {

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private PaymentRepository paymentRepository;

    @InjectMocks
    private PlayerIncomeReportService reportService;

    private User playerUser;
    private GamePlayer gamePlayer;

    @BeforeEach
    void setUp() {
        playerUser = new User();
        playerUser.setId(10L);
        playerUser.setUsername("pro_idol");
        playerUser.setFullName("Pro Idol");

        gamePlayer = new GamePlayer();
        gamePlayer.setId(100L);
        gamePlayer.setUser(playerUser);
    }

    @Test
    @DisplayName("escapeCsvField: Prevent formula injection and properly escape quotes")
    void testEscapeCsvFieldFormulaInjection() {
        // Leading '=' should be prepended with single quote
        String equalsFormula = reportService.escapeCsvField("=SUM(A1:B10)");
        assertEquals("\"'=SUM(A1:B10)\"", equalsFormula);

        // Leading '+' should be prepended with single quote
        String plusFormula = reportService.escapeCsvField("+cmd|' /C calc'!A0");
        assertEquals("\"'+cmd|' /C calc'!A0\"", plusFormula);

        // Leading '-' should be prepended with single quote
        String minusFormula = reportService.escapeCsvField("-EXEC('calc.exe')");
        assertEquals("\"'-EXEC('calc.exe')\"", minusFormula);

        // Leading '@' should be prepended with single quote
        String atFormula = reportService.escapeCsvField("@SUM(1,2)");
        assertEquals("\"'@SUM(1,2)\"", atFormula);

        // Quotes inside field should be doubled
        String withQuotes = reportService.escapeCsvField("User \"VIP\" Test");
        assertEquals("\"User \"\"VIP\"\" Test\"", withQuotes);

        // Null should produce empty quoted string
        assertEquals("\"\"", reportService.escapeCsvField(null));
    }

    @Test
    @DisplayName("generateStatementCsv: Only include COMPLETED orders with RELEASED payout, exclude CANCELED/PENDING")
    void testGenerateStatementCsvExcludesPendingEscrowAndCanceledOrders() {
        User renter = new User();
        renter.setId(20L);
        renter.setUsername("=EvilRenter");
        renter.setFullName("=Evil Renter");

        // Order 1: COMPLETED, but payoutStatus is PENDING (in 24h escrow) -> Excluded from statement
        Order orderEscrow = new Order();
        orderEscrow.setId(101L);
        orderEscrow.setPlayer(gamePlayer);
        orderEscrow.setRenter(renter);
        orderEscrow.setStatus("COMPLETED");
        orderEscrow.setPayoutStatus("PENDING");
        orderEscrow.setPrice(100000L);
        orderEscrow.setDiscountRate(0.15);
        orderEscrow.setPlatformFee(15000L);
        orderEscrow.setPlayerReceived(85000L);
        orderEscrow.setEndTime(LocalDateTime.now());

        // Order 2: CANCELED -> Excluded from statement
        Order orderCanceled = new Order();
        orderCanceled.setId(102L);
        orderCanceled.setPlayer(gamePlayer);
        orderCanceled.setRenter(renter);
        orderCanceled.setStatus("CANCELED");
        orderCanceled.setPayoutStatus("REFUNDED");
        orderCanceled.setPrice(100000L);
        orderCanceled.setEndTime(LocalDateTime.now());

        // Order 3: COMPLETED and payoutStatus is RELEASED -> Included!
        Order orderReleased = new Order();
        orderReleased.setId(103L);
        orderReleased.setPlayer(gamePlayer);
        orderReleased.setRenter(renter);
        orderReleased.setStatus("COMPLETED");
        orderReleased.setPayoutStatus("RELEASED");
        orderReleased.setPrice(200000L);
        orderReleased.setDiscountRate(0.10); // Custom 10%
        orderReleased.setPlatformFee(20000L);
        orderReleased.setPlayerReceived(180000L);
        orderReleased.setPayoutReleasedAt(LocalDateTime.now());

        when(orderRepository.findAllByUserId(playerUser.getId()))
                .thenReturn(List.of(orderEscrow, orderCanceled, orderReleased));
        when(paymentRepository.findByPlayerIdAndTypeOrderByCreatedAtDesc(playerUser.getId(), Payment.PaymentType.DONATE))
                .thenReturn(List.of());

        byte[] csvBytes = reportService.generateStatementCsv(playerUser, LocalDate.now().minusDays(1), LocalDate.now().plusDays(1));
        String csvContent = new String(csvBytes, StandardCharsets.UTF_8);

        // Header check
        assertTrue(csvContent.contains("Mã giao dịch,Thời gian hoàn thành,Loại giao dịch"));
        assertTrue(csvContent.contains("Tỷ lệ phí"));

        // ORD-101 and ORD-102 must NOT be in CSV
        assertFalse(csvContent.contains("ORD-101"));
        assertFalse(csvContent.contains("ORD-102"));

        // ORD-103 must be in CSV
        assertTrue(csvContent.contains("ORD-103"));
        assertTrue(csvContent.contains("180000")); // Player net received
        assertTrue(csvContent.contains("10%")); // Dynamic discount rate

        // Formula injection protection on renter name starting with '='
        assertTrue(csvContent.contains("\"'=Evil Renter\"") || csvContent.contains("\"'=EvilRenter\""));
    }

    @Test
    @DisplayName("getPlayerIncomeReport: Separates escrow frozen income from realized income")
    void testGetPlayerIncomeReportSeparatesFrozenIncome() {
        LocalDateTime now = LocalDateTime.now();

        // Order 1: Frozen escrow order (COMPLETED but payoutStatus PENDING)
        Order frozenOrder = new Order();
        frozenOrder.setId(201L);
        frozenOrder.setPlayer(gamePlayer);
        frozenOrder.setStatus("COMPLETED");
        frozenOrder.setPayoutStatus("PENDING");
        frozenOrder.setPrice(100000L);
        frozenOrder.setDiscountRate(0.15);
        frozenOrder.setPlatformFee(15000L);
        frozenOrder.setPlayerReceived(85000L);
        frozenOrder.setEndTime(now);

        // Order 2: Released order (COMPLETED and payoutStatus RELEASED)
        Order releasedOrder = new Order();
        releasedOrder.setId(202L);
        releasedOrder.setPlayer(gamePlayer);
        releasedOrder.setStatus("COMPLETED");
        releasedOrder.setPayoutStatus("RELEASED");
        releasedOrder.setPrice(100000L);
        releasedOrder.setDiscountRate(0.15);
        releasedOrder.setPlatformFee(15000L);
        releasedOrder.setPlayerReceived(85000L);
        releasedOrder.setPayoutReleasedAt(now);

        when(orderRepository.findAllByUserId(playerUser.getId()))
                .thenReturn(List.of(frozenOrder, releasedOrder));
        when(paymentRepository.findByPlayerIdAndTypeOrderByCreatedAtDesc(playerUser.getId(), Payment.PaymentType.DONATE))
                .thenReturn(List.of());

        PlayerIncomeReportDTO report = reportService.getPlayerIncomeReport(playerUser);

        assertNotNull(report);
        // Frozen income should hold 85,000 đ
        assertEquals(85000L, report.getFrozenIncome());
        // Realized today income should only be the released 85,000 đ, NOT 170,000 đ
        assertEquals(85000L, report.getTodayIncome());
        assertEquals(85000L, report.getThisWeekIncome());
        assertEquals(85000L, report.getTotalIncome());
        // Both completed orders are counted in total completed order count
        assertEquals(2, report.getCompletedOrdersCount());
    }
}


package com.example.backend.repository;

import com.example.backend.entity.Moment;
import com.example.backend.entity.MomentLike;
import com.example.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MomentLikeRepository extends JpaRepository<MomentLike, Long> {
    long countByMomentId(Long momentId);

    boolean existsByMomentAndUser(Moment moment, User user);

    Optional<MomentLike> findByMomentAndUser(Moment moment, User user);

    List<MomentLike> findByMomentIdOrderByLikedAtDesc(Long momentId);

    @Modifying
    @Query("DELETE FROM MomentLike ml WHERE ml.moment.id = ?1 AND ml.user.id = ?2")
    void deleteByMomentIdAndUserId(Long momentId, Long userId);
}

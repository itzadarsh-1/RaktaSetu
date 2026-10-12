package com.raktasetu.repository;

import com.raktasetu.model.PasswordResetToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.Optional;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {
    Optional<PasswordResetToken> findByTokenHash(String tokenHash);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<PasswordResetToken> findWithLockByTokenHash(String tokenHash);
    boolean existsByUserIdAndCreatedAtAfter(Long userId, Instant createdAt);
}

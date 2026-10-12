package com.raktasetu.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "password_reset_tokens", indexes = @Index(name="ix_reset_user", columnList="user_id"))
public class PasswordResetToken {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY)
    public Long id;
    @ManyToOne(fetch=FetchType.LAZY, optional=false)
    @JoinColumn(name="user_id", nullable=false)
    public User user;
    @Column(nullable=false, unique=true, length=64)
    public String tokenHash;
    @Column(nullable=false)
    public Instant expiresAt;
    public Instant usedAt;
    @Column(nullable=false)
    public Instant createdAt = Instant.now();
}

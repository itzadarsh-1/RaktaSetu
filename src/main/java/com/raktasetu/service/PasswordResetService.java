package com.raktasetu.service;

import com.raktasetu.model.PasswordResetToken;
import com.raktasetu.repository.PasswordResetTokenRepository;
import com.raktasetu.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.HexFormat;

@Service
public class PasswordResetService {
    private final UserRepository users;
    private final PasswordResetTokenRepository tokens;
    private final PasswordEncoder encoder;
    private final JavaMailSender mail;
    private final SecureRandom random = new SecureRandom();
    @Value("${raktasetu.mail.from:}") private String from;
    @Value("${raktasetu.base-url:http://localhost:8080}") private String baseUrl;

    public PasswordResetService(UserRepository users, PasswordResetTokenRepository tokens,
                                PasswordEncoder encoder, JavaMailSender mail) {
        this.users=users; this.tokens=tokens; this.encoder=encoder; this.mail=mail;
    }

    private String hash(String raw) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                .digest(raw.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) { throw new IllegalStateException("SHA-256 unavailable", e); }
    }

    // Always show the same confirmation to avoid revealing registered email addresses.
    @Transactional
    public void request(String email) {
        if (email==null || email.isBlank() || email.length()>254) return;
        var found=users.findByEmailIgnoreCase(email.trim());
        if (found.isEmpty() || !found.get().enabled) return;
        var user=found.get();
        // One reset email per account per minute.
        if (tokens.existsByUserIdAndCreatedAtAfter(user.id, Instant.now().minus(1, ChronoUnit.MINUTES))) return;
        byte[] bytes=new byte[32]; random.nextBytes(bytes);
        String raw=Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        PasswordResetToken token=new PasswordResetToken();
        token.user=user; token.tokenHash=hash(raw);
        token.expiresAt=Instant.now().plus(15, ChronoUnit.MINUTES);
        tokens.save(token);
        SimpleMailMessage message=new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(user.email);
        message.setSubject("RaktaSetu - Reset your password");
        message.setText("We received a request to reset your RaktaSetu password.\n\n"
            +"Open this link within 15 minutes:\n"
            +baseUrl.replaceAll("/+$", "")+"/reset-password?token="+raw
            +"\n\nIf you did not request this, ignore this email.");
        mail.send(message);
    }

    @Transactional(readOnly=true)
    public boolean valid(String raw) {
        if (raw==null || !raw.matches("[A-Za-z0-9_-]{43}")) return false;
        return tokens.findByTokenHash(hash(raw))
            .filter(t->t.usedAt==null && t.expiresAt.isAfter(Instant.now()) && t.user.enabled)
            .isPresent();
    }

    @Transactional
    public boolean reset(String raw, String password) {
        if (raw==null || !raw.matches("[A-Za-z0-9_-]{43}") || password==null || password.length()<12 || password.length()>128) return false;
        // Obtain a row lock to prevent two concurrent uses of the same link.
        var maybeToken=tokens.findWithLockByTokenHash(hash(raw));
        if (maybeToken.isEmpty()) return false;
        var token=maybeToken.get();
        if (token.usedAt!=null || !token.expiresAt.isAfter(Instant.now()) || !token.user.enabled) return false;
        token.user.password=encoder.encode(password);
        token.usedAt=Instant.now();
        users.save(token.user);
        tokens.save(token);
        return true;
    }
}

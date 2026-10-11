package com.raktasetu.repository;
import com.raktasetu.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface UserRepository extends JpaRepository<User,Long> {
 Optional<User> findByEmailIgnoreCase(String email);
 boolean existsByEmailIgnoreCase(String email);
 List<User> findByRoleAndEnabledTrue(String role);
}

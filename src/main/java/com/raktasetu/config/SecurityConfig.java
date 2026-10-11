package com.raktasetu.config;
import com.raktasetu.repository.UserRepository;
import org.springframework.context.annotation.*;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.core.userdetails.*;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.Customizer;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
@Configuration
public class SecurityConfig {
 @Bean PasswordEncoder encoder(){return new BCryptPasswordEncoder();}
 @Bean UserDetailsService users(UserRepository repo){return email->{var u=repo.findByEmailIgnoreCase(email).orElseThrow(()->new UsernameNotFoundException("User not found"));return User.withUsername(u.email).password(u.password).roles(u.role).disabled(!u.enabled).build();};}
 @Bean SecurityFilterChain chain(HttpSecurity http)throws Exception {
   return http.authorizeHttpRequests(a->a.requestMatchers("/","/login","/register","/css/**","/js/**","/api/auth/register","/api/public/**","/error").permitAll().requestMatchers("/api/admin/**").hasRole("ADMIN").requestMatchers("/api/donor/**").hasRole("DONOR").requestMatchers("/api/requester/**").hasRole("REQUESTER").anyRequest().authenticated())
    .formLogin(f->f.loginPage("/login").loginProcessingUrl("/perform-login").usernameParameter("email").defaultSuccessUrl("/dashboard",true).failureUrl("/login?error").permitAll())
    .logout(l->l.logoutUrl("/logout").logoutSuccessUrl("/").permitAll())
    .csrf(c->c.csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse()))
    .build();
 }
}

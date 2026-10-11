package com.raktasetu.config;
import com.raktasetu.model.User;
import com.raktasetu.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;
@Configuration public class AdminSeeder {
 @Bean CommandLineRunner initialAdmin(UserRepository users,PasswordEncoder passwords){return args->{String email=System.getenv("RAKTASETU_ADMIN_EMAIL");String password=System.getenv("RAKTASETU_ADMIN_PASSWORD");if(email!=null&&!email.isBlank()&&password!=null&&password.length()>=12&&!users.existsByEmailIgnoreCase(email)){User u=new User();u.name="Administrator";u.email=email.toLowerCase();u.password=passwords.encode(password);u.role="ADMIN";users.save(u);System.out.println("Admin user created: "+email);}};}
}

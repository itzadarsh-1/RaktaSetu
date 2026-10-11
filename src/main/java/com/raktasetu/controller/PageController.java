package com.raktasetu.controller;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.security.core.Authentication;
@Controller
public class PageController {
 @GetMapping("/") String home(){return "index";}
 @GetMapping("/login") String login(){return "login";}
 @GetMapping("/register") String register(){return "register";}
 @GetMapping("/dashboard") String dashboard(Authentication auth){if(auth.getAuthorities().stream().anyMatch(a->a.getAuthority().equals("ROLE_ADMIN")))return "admin";if(auth.getAuthorities().stream().anyMatch(a->a.getAuthority().equals("ROLE_DONOR")))return "donor";return "requester";}
}

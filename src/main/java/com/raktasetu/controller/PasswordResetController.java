package com.raktasetu.controller;

import com.raktasetu.service.PasswordResetService;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

@Controller
public class PasswordResetController {
    private final PasswordResetService service;
    public PasswordResetController(PasswordResetService service) { this.service=service; }

    @GetMapping("/forgot-password")
    public String forgot(){return "forgot-password";}

    @PostMapping("/forgot-password")
    public String send(@RequestParam String email, RedirectAttributes redirect){
        try { service.request(email); }
        catch (org.springframework.mail.MailException ex) {
            // A mail transport failure must not be mistaken for a successful delivery.
            redirect.addFlashAttribute("mailError", "Email delivery is currently unavailable. Please try again later.");
            return "redirect:/forgot-password";
        }
        redirect.addFlashAttribute("message", "If that email is registered, a reset link has been sent. Check your inbox and spam folder.");
        return "redirect:/forgot-password";
    }

    @GetMapping("/reset-password")
    public String page(@RequestParam(required=false) String token, Model model){
        model.addAttribute("token", token);
        model.addAttribute("valid", service.valid(token));
        return "reset-password";
    }

    @PostMapping("/reset-password")
    public String submit(@RequestParam String token, @RequestParam String password,
                         @RequestParam String confirmPassword, Model model){
        if (!password.equals(confirmPassword)) {
            model.addAttribute("error", "Passwords do not match.");
        } else if (password.length()<12 || password.length()>128) {
            model.addAttribute("error", "Use a password between 12 and 128 characters.");
        } else if (service.reset(token, password)) {
            return "redirect:/login?reset=success";
        } else {
            model.addAttribute("error", "Reset link is invalid, expired, or already used.");
        }
        model.addAttribute("token", token);
        model.addAttribute("valid", service.valid(token));
        return "reset-password";
    }
}

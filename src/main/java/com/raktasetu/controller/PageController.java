
package com.raktasetu.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.security.core.Authentication;
import org.springframework.security.access.prepost.PreAuthorize;

@Controller
public class PageController {

    // =====================================
    // PUBLIC PAGES
    // =====================================

    @GetMapping("/")
    public String home() {
        return "index";
    }

    @GetMapping("/login")
    public String login() {
        return "login";
    }

    @GetMapping("/register")
    public String register() {
        return "register";
    }

    // =====================================
    // MAIN DASHBOARD - ROLE BASED
    // =====================================

    @GetMapping("/dashboard")
    public String dashboard(Authentication auth) {

        if (auth.getAuthorities().stream()
                .anyMatch(a ->
                    a.getAuthority().equals("ROLE_ADMIN"))) {

            return "admin";
        }

        if (auth.getAuthorities().stream()
                .anyMatch(a ->
                    a.getAuthority().equals("ROLE_DONOR"))) {

            return "donor";
        }

        return "requester";
    }

    // =====================================
    // REQUESTER PAGES
    // =====================================

    @PreAuthorize("hasRole('REQUESTER')")
    @GetMapping("/dashboard/raise-request")
    public String raiseRequest() {
        return "requester-raise-request";
    }

    @PreAuthorize("hasRole('REQUESTER')")
    @GetMapping("/dashboard/find-donors")
    public String findDonors() {
        return "requester-find-donors";
    }

    @PreAuthorize("hasRole('REQUESTER')")
    @GetMapping("/dashboard/my-requests")
    public String myRequests() {
        return "requester-my-requests";
    }

    @PreAuthorize("hasRole('REQUESTER')")
    @GetMapping("/dashboard/profile")
    public String requesterProfile() {
        return "requester-profile";
    }

    // =====================================
    // DONOR PAGES
    // =====================================

    @PreAuthorize("hasRole('DONOR')")
    @GetMapping("/donor/profile")
    public String donorProfile() {
        return "donor-profile";
    }

    @PreAuthorize("hasRole('DONOR')")
    @GetMapping("/donor/availability")
    public String donorAvailability() {
        return "donor-availability";
    }

    @PreAuthorize("hasRole('DONOR')")
    @GetMapping("/donor/requests")
    public String donorRequests() {
        return "donor-requests";
    }

    // NEW - DONOR DONATION HISTORY

    @PreAuthorize("hasRole('DONOR')")
    @GetMapping("/donor/donations")
    public String donorDonations() {
        return "donor-donations";
    }

    // =====================================
    // ADMIN PAGES
    // =====================================

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/admin/users")
    public String adminUsers() {
        return "admin-users";
    }

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/admin/requests")
    public String adminRequests() {
        return "admin-requests";
    }

    // NEW - ADMIN DONATION MANAGEMENT

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/admin/donations")
    public String adminDonations() {
        return "admin-donations";
    }

}

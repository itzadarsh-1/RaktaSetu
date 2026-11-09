
package com.raktasetu.controller;

import com.raktasetu.model.BloodDonation;
import com.raktasetu.model.User;
import com.raktasetu.repository.BloodDonationRepository;
import com.raktasetu.repository.UserRepository;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/donations")
public class AdminDonationController {

    private final BloodDonationRepository donations;
    private final UserRepository users;

    public AdminDonationController(
            BloodDonationRepository donations,
            UserRepository users) {

        this.donations = donations;
        this.users = users;
    }

    // REQUEST DATA
    public record DonationInput(
        Long donorId,
        LocalDate donationDate,
        Integer quantityMl,
        String hospital,
        String city
    ) {}

    // RESPONSE DATA
    public record DonationResult(
        Long id,
        Long donorId,
        String donorName,
        LocalDate donationDate,
        Integer quantityMl,
        String hospital,
        String city,
        String status
    ) {}

    // CONVERT ENTITY TO RESPONSE
    private DonationResult toResult(BloodDonation d) {

        User donor = d.donor;

        return new DonationResult(
            d.id,
            donor != null ? donor.getId() : null,
            donor != null ? donor.getName() : null,
            d.donationDate,
            d.quantityMl,
            d.hospital,
            d.city,
            d.status
        );
    }

    // GET CURRENT ADMIN
    private User currentAdmin(Authentication auth) {

        if (auth == null || !auth.isAuthenticated()) {
            throw new ResponseStatusException(
                HttpStatus.UNAUTHORIZED,
                "Login required"
            );
        }

        User admin = users
            .findByEmailIgnoreCase(auth.getName())
            .orElseThrow(() ->
                new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Admin not found"
                )
            );

        if (!"ADMIN".equals(admin.role)) {
            throw new ResponseStatusException(
                HttpStatus.FORBIDDEN,
                "Admin access only"
            );
        }

        return admin;
    }

    // ADD DONATION
    // POST /api/admin/donations
    @PostMapping
    @Transactional
    public DonationResult addDonation(
            Authentication auth,
            @RequestBody DonationInput input) {

        currentAdmin(auth);

        if (input == null
                || input.donorId() == null
                || input.donationDate() == null
                || input.quantityMl() == null) {

            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Donor, date and quantity are required"
            );
        }

        if (input.donationDate().isAfter(LocalDate.now())) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Donation date cannot be in the future"
            );
        }

        if (input.quantityMl() <= 0
                || input.quantityMl() > 1000) {

            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Invalid donation quantity"
            );
        }

        User donor = users.findById(input.donorId())
            .orElseThrow(() ->
                new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Donor not found"
                )
            );

        if (!"DONOR".equals(donor.role) || !donor.enabled) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Selected user is not an active donor"
            );
        }

        BloodDonation donation = new BloodDonation();

        donation.donor = donor;
        donation.donationDate = input.donationDate();
        donation.quantityMl = input.quantityMl();

        donation.hospital =
            input.hospital() == null
                ? ""
                : input.hospital().trim();

        donation.city =
            input.city() == null
                ? ""
                : input.city().trim();

        donation.status = "PENDING";
        donation.createdAt = LocalDateTime.now();

        BloodDonation saved = donations.save(donation);

        return toResult(saved);
    }

    // VIEW ALL DONATIONS
    // GET /api/admin/donations
    @GetMapping
    @Transactional(readOnly = true)
    public List<DonationResult> allDonations(
            Authentication auth) {

        currentAdmin(auth);

        return donations.findAll()
            .stream()
            .map(this::toResult)
            .toList();
    }

    // VERIFY DONATION
    // PUT /api/admin/donations/{id}/verify
    @PutMapping("/{id}/verify")
    @Transactional
    public DonationResult verifyDonation(
            Authentication auth,
            @PathVariable Long id) {

        User admin = currentAdmin(auth);

        BloodDonation donation = donations.findById(id)
            .orElseThrow(() ->
                new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Donation record not found"
                )
            );

        if (!"PENDING".equals(donation.status)) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Only pending donations can be verified"
            );
        }

        donation.status = "VERIFIED";
        donation.verifiedBy = admin;
        donation.verifiedAt = LocalDateTime.now();

        return toResult(donations.save(donation));
    }

    // REJECT DONATION
    // PUT /api/admin/donations/{id}/reject
    @PutMapping("/{id}/reject")
    @Transactional
    public Map<String, String> rejectDonation(
            Authentication auth,
            @PathVariable Long id) {

        currentAdmin(auth);

        BloodDonation donation = donations.findById(id)
            .orElseThrow(() ->
                new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Donation record not found"
                )
            );

        if (!"PENDING".equals(donation.status)) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Only pending donations can be rejected"
            );
        }

        donation.status = "REJECTED";

        donations.save(donation);

        return Map.of(
            "message",
            "Donation record rejected"
        );
    }
}

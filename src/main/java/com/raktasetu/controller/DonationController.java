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
import java.util.List;
@RestController
@RequestMapping("/api/donor/donations")
public class DonationController {
    private final BloodDonationRepository donations;
    private final UserRepository users;
    public DonationController(
            BloodDonationRepository donations,
            UserRepository users) {
        this.donations = donations;
        this.users = users;
    }
    public record DonationHistory(
            Long id,
            LocalDate donationDate,
            Integer quantityMl,
            String hospital,
            String city,
            String status
    ) {}
    public record DonationSummary(
            long totalDonations,
            long totalBloodMl,
            double totalBloodLitres
    ) {}
    private User currentDonor(Authentication auth) {
        if (auth == null || !auth.isAuthenticated()) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Login required"
            );
        }
        User donor = users.findByEmailIgnoreCase(auth.getName())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED,
                        "Donor not found"
                ));
        if (!"DONOR".equals(donor.role)) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Donor access only"
            );
        }
        return donor;
    }
    private List<BloodDonation> verifiedDonations(
            Authentication auth) {
        User donor = currentDonor(auth);
        return donations.findByDonorIdAndStatusOrderByDonationDateDesc(
                donor.getId(),
                "VERIFIED"
        );
    }
    @GetMapping
    @Transactional(readOnly = true)
    public List<DonationHistory> history(Authentication auth) {
        return verifiedDonations(auth).stream()
                .map(d -> new DonationHistory(
                        d.id,
                        d.donationDate,
                        d.quantityMl,
                        d.hospital,
                        d.city,
                        d.status
                ))
                .toList();
    }
    @GetMapping("/summary")
    @Transactional(readOnly = true)
    public DonationSummary summary(Authentication auth) {
        List<BloodDonation> records = verifiedDonations(auth);
        long totalMl = records.stream()
                .mapToLong(d -> d.quantityMl == null ? 0 : d.quantityMl)
                .sum();
        return new DonationSummary(
                records.size(),
                totalMl,
                totalMl / 1000.0
        );
    }
}

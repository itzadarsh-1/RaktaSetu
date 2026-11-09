
package com.raktasetu.model;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "blood_donations")
public class BloodDonation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "donor_id", nullable = false)
    public User donor;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "blood_request_id")
    public BloodRequest bloodRequest;

    @Column(nullable = false)
    public LocalDate donationDate;

    @Column(nullable = false)
    public Integer quantityMl;

    public String hospital;

    public String city;

    @Column(nullable = false)
    public String status = "PENDING";

    public LocalDateTime createdAt = LocalDateTime.now();

    public LocalDateTime verifiedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "verified_by")
    public User verifiedBy;

    public BloodDonation() {
    }
}

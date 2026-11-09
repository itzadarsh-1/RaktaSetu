
package com.raktasetu.repository;

import com.raktasetu.model.BloodDonation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BloodDonationRepository
        extends JpaRepository<BloodDonation, Long> {

    // 1. Donor ki verified/pending donation history
    List<BloodDonation>
    findByDonorIdAndStatusOrderByDonationDateDesc(
            Long donorId,
            String status
    );

    // 2. Admin: sabhi donation records (newest first)
    List<BloodDonation>
    findAllByOrderByDonationDateDesc();

}

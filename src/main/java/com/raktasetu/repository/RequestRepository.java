package com.raktasetu.repository;
import com.raktasetu.model.BloodRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface RequestRepository extends JpaRepository<BloodRequest,Long> {
 List<BloodRequest> findByRequesterIdOrderByCreatedAtDesc(Long id);
 List<BloodRequest> findByDonorIdOrderByCreatedAtDesc(Long id);
 List<BloodRequest> findByDonorIsNullAndBloodGroupAndStatusOrderByCreatedAtDesc(String bloodGroup,String status);
 List<BloodRequest> findAllByOrderByCreatedAtDesc();
}

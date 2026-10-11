package com.raktasetu.model;
import jakarta.persistence.*;
import java.time.LocalDateTime;
@Entity @Table(name="blood_requests")
public class BloodRequest {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) public Long id;
 @ManyToOne(fetch=FetchType.EAGER) @JoinColumn(name="requester_id",nullable=false) public User requester;
 @ManyToOne(fetch=FetchType.EAGER) @JoinColumn(name="donor_id") public User donor;
 @Column(nullable=false) public String bloodGroup;
 @Column(nullable=false) public String city;
 public String hospital;
 public Integer unitsRequired=1;
 public String phone;
 public String message;
 public String urgency="EMERGENCY";
 public String status="PENDING";
 public LocalDateTime createdAt=LocalDateTime.now();
 public BloodRequest(){}
}

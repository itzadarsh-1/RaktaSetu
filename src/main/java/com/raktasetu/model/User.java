package com.raktasetu.model;
import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnore;
@Entity @Table(name="users",indexes={@Index(name="ix_blood_city",columnList="bloodGroup,city")})
public class User {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) public Long id;
 @Column(nullable=false) public String name;
 @Column(nullable=false,unique=true) public String email;
 @JsonIgnore @Column(nullable=false) public String password;
 @Column(nullable=false) public String role="REQUESTER";
 public String mobile;
 public String bloodGroup;
 public String city;
 public String state;
 public Double latitude;
 public Double longitude;
 public boolean available=true;
 public boolean enabled=true;
 public User(){}
}

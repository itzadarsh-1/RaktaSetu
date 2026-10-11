package com.raktasetu.dto;
import jakarta.validation.constraints.*;
public class Forms {
 public record Registration(@NotBlank String name,@NotBlank @Email String email,@NotBlank @Size(min=8) String password,@NotBlank String role,String mobile,String bloodGroup,String city,String state){}
 public record Profile(String name,String mobile,String bloodGroup,String city,String state,Boolean available,Double latitude,Double longitude){}
 public record NewRequest(@NotBlank String bloodGroup,@NotBlank String city,String hospital,@Min(1) @Max(20) Integer unitsRequired,String phone,String message,String urgency,Long donorId){}
}

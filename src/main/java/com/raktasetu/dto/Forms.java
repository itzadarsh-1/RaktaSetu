
package com.raktasetu.dto;

import jakarta.validation.constraints.*;

public class Forms {

    // USER REGISTRATION
    public record Registration(

        @NotBlank(message = "Name is required")
        String name,

        @NotBlank(message = "Email is required")
        @Email(message = "Enter a valid email")
        String email,

        @NotBlank(message = "Password cannot be empty")
        String password,

        @NotBlank(message = "Please select a role")
        String role,

        // Optional, but must contain exactly 10 digits if entered
        @Pattern(
            regexp = "([0-9]{10})?",
            message = "Mobile number must be exactly 10 digits"
        )
        String mobile,

        String bloodGroup,
        String city,
        String state

    ) {}


    // USER PROFILE UPDATE
    public record Profile(

        String name,

        // Optional, but must contain exactly 10 digits if entered
        @Pattern(
            regexp = "([0-9]{10})?",
            message = "Mobile number must be exactly 10 digits"
        )
        String mobile,

        String bloodGroup,
        String city,
        String state,

        Boolean available,

        Double latitude,
        Double longitude

    ) {}


    // EMERGENCY BLOOD REQUEST
    public record NewRequest(

        @NotBlank(message = "Blood group is required")
        String bloodGroup,

        @NotBlank(message = "City is required")
        String city,

        String hospital,

        @Min(
            value = 1,
            message = "Minimum 1 unit is required"
        )
        @Max(
            value = 20,
            message = "Maximum 20 units allowed"
        )
        Integer unitsRequired,

        // Required: exactly 10 digits
        @NotBlank(message = "Mobile number is required")
        @Pattern(
            regexp = "[0-9]{10}",
            message = "Mobile number must be exactly 10 digits"
        )
        String phone,

        String message,
        String urgency,
        Long donorId

    ) {}
}


package com.raktasetu.controller;

import com.lowagie.text.*;
import com.lowagie.text.pdf.*;

import com.raktasetu.model.BloodDonation;
import com.raktasetu.model.User;
import com.raktasetu.repository.BloodDonationRepository;
import com.raktasetu.repository.UserRepository;

import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.io.ByteArrayOutputStream;
import java.time.format.DateTimeFormatter;
import java.util.List;

@RestController
@RequestMapping("/api/donor/donations")
public class DonationReportController {

    private final BloodDonationRepository donations;
    private final UserRepository users;

    public DonationReportController(
            BloodDonationRepository donations,
            UserRepository users) {

        this.donations = donations;
        this.users = users;
    }

    // =====================================
    // DOWNLOAD DONOR PDF REPORT
    // =====================================

    @GetMapping(
        value = "/report",
        produces = MediaType.APPLICATION_PDF_VALUE
    )
    public ResponseEntity<byte[]> downloadReport(
            Authentication auth) {

        if (auth == null || !auth.isAuthenticated()) {
            throw new ResponseStatusException(
                HttpStatus.UNAUTHORIZED,
                "Login required"
            );
        }

        User donor = users
            .findByEmailIgnoreCase(auth.getName())
            .orElseThrow(() ->
                new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "User not found"
                )
            );

        if (!"DONOR".equals(donor.role)) {
            throw new ResponseStatusException(
                HttpStatus.FORBIDDEN,
                "Donor access only"
            );
        }

        List<BloodDonation> history =
            donations.findByDonorIdAndStatusOrderByDonationDateDesc(
                donor.id,
                "VERIFIED"
            );

        long totalMl = history.stream()
            .filter(d -> d.quantityMl != null)
            .mapToLong(d -> d.quantityMl)
            .sum();

        ByteArrayOutputStream output =
            new ByteArrayOutputStream();

        Document document = new Document(
            PageSize.A4, 40, 40, 45, 45
        );

        try {
            PdfWriter.getInstance(document, output);
            document.open();

            Font titleFont = new Font(
                Font.HELVETICA, 20, Font.BOLD
            );

            Font headingFont = new Font(
                Font.HELVETICA, 12, Font.BOLD
            );

            Font normalFont = new Font(
                Font.HELVETICA, 10, Font.NORMAL
            );

            Paragraph title = new Paragraph(
                "RAKTASETU",
                titleFont
            );

            title.setAlignment(Element.ALIGN_CENTER);
            document.add(title);

            Paragraph subtitle = new Paragraph(
                "Blood Donation History Report",
                headingFont
            );

            subtitle.setAlignment(Element.ALIGN_CENTER);
            subtitle.setSpacingAfter(25);
            document.add(subtitle);

            document.add(new Paragraph(
                "Donor Name: " + donor.name,
                normalFont
            ));

            document.add(new Paragraph(
                "Blood Group: " +
                (donor.bloodGroup == null
                    ? "N/A"
                    : donor.bloodGroup),
                normalFont
            ));

            document.add(new Paragraph(
                "Donor ID: " + donor.id,
                normalFont
            ));

            document.add(new Paragraph(
                "Total Verified Donations: " + history.size(),
                headingFont
            ));

            Paragraph total = new Paragraph(
                "Total Blood Donated: " + totalMl + " mL",
                headingFont
            );

            total.setSpacingAfter(20);
            document.add(total);

            PdfPTable table = new PdfPTable(4);
            table.setWidthPercentage(100);
            table.setWidths(new float[]{2, 2, 3, 2});

            addHeader(table, "Date");
            addHeader(table, "Quantity");
            addHeader(table, "Hospital");
            addHeader(table, "City");

            DateTimeFormatter formatter =
                DateTimeFormatter.ofPattern("dd-MM-yyyy");

            for (BloodDonation d : history) {

                addCell(
                    table,
                    d.donationDate == null
                        ? "-"
                        : d.donationDate.format(formatter)
                );

                addCell(
                    table,
                    d.quantityMl + " mL"
                );

                addCell(
                    table,
                    d.hospital == null ? "-" : d.hospital
                );

                addCell(
                    table,
                    d.city == null ? "-" : d.city
                );
            }

            if (history.isEmpty()) {
                PdfPCell empty = new PdfPCell(
                    new Phrase("No verified donations found")
                );
                empty.setColspan(4);
                empty.setPadding(10);
                empty.setHorizontalAlignment(
                    Element.ALIGN_CENTER
                );
                table.addCell(empty);
            }

            document.add(table);

            Paragraph note = new Paragraph(
                "This report summarizes donation records " +
                "marked as verified in RaktaSetu. " +
                "It is not a hospital-issued medical certificate.",
                normalFont
            );

            note.setSpacingBefore(25);
            document.add(note);

        } catch (DocumentException e) {

            throw new ResponseStatusException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "Unable to generate PDF report",
                e
            );

        } finally {

            if (document.isOpen()) {
                document.close();
            }
        }

        byte[] pdf = output.toByteArray();

        return ResponseEntity.ok()
            .header(
                HttpHeaders.CONTENT_DISPOSITION,
                "attachment; filename=\"raktasetu-donation-report.pdf\""
            )
            .contentType(MediaType.APPLICATION_PDF)
            .contentLength(pdf.length)
            .body(pdf);
    }

    // =====================================
    // PDF TABLE HEADER
    // =====================================

    private void addHeader(
            PdfPTable table,
            String text) {

        PdfPCell cell = new PdfPCell(
            new Phrase(
                text,
                new Font(
                    Font.HELVETICA,
                    10,
                    Font.BOLD
                )
            )
        );

        cell.setPadding(8);
        cell.setBackgroundColor(
            new java.awt.Color(235, 235, 235)
        );

        table.addCell(cell);
    }

    // =====================================
    // PDF TABLE CELL
    // =====================================

    private void addCell(
            PdfPTable table,
            String text) {

        PdfPCell cell = new PdfPCell(
            new Phrase(
                text == null ? "-" : text
            )
        );

        cell.setPadding(7);
        table.addCell(cell);
    }
}

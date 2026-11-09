
package com.raktasetu.controller;

import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;

import com.raktasetu.model.BloodRequest;
import com.raktasetu.model.User;
import com.raktasetu.repository.RequestRepository;
import com.raktasetu.repository.UserRepository;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.io.ByteArrayOutputStream;
import java.time.format.DateTimeFormatter;
import java.util.List;

@RestController
@RequestMapping("/api/requester/requests")
public class RequesterReportController {

    private final RequestRepository requests;
    private final UserRepository users;

    public RequesterReportController(
            RequestRepository requests,
            UserRepository users) {

        this.requests = requests;
        this.users = users;
    }

    private User currentRequester(Authentication auth) {

        if (auth == null || !auth.isAuthenticated()) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Login required"
            );
        }

        User user = users
                .findByEmailIgnoreCase(auth.getName())
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.UNAUTHORIZED,
                                "User not found"
                        )
                );

        if (!"REQUESTER".equals(user.role)) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Requester access only"
            );
        }

        return user;
    }

    private String safe(String value) {
        return value == null || value.isBlank()
                ? "Not specified"
                : value.trim();
    }

    private void addRow(
            PdfPTable table,
            String label,
            String value) {

        Font labelFont = FontFactory.getFont(
                FontFactory.HELVETICA_BOLD, 10
        );

        Font valueFont = FontFactory.getFont(
                FontFactory.HELVETICA, 10
        );

        PdfPCell labelCell = new PdfPCell(
                new Phrase(label, labelFont)
        );

        PdfPCell valueCell = new PdfPCell(
                new Phrase(safe(value), valueFont)
        );

        labelCell.setPadding(7);
        valueCell.setPadding(7);

        table.addCell(labelCell);
        table.addCell(valueCell);
    }

    @GetMapping(
        value = "/report",
        produces = MediaType.APPLICATION_PDF_VALUE
    )
    public ResponseEntity<byte[]> downloadReport(
            Authentication auth) {

        User requester = currentRequester(auth);

        List<BloodRequest> records =
                requests.findByRequesterIdOrderByCreatedAtDesc(
                        requester.getId()
                );

        ByteArrayOutputStream output =
                new ByteArrayOutputStream();

        Document document = new Document();

        try {
            PdfWriter.getInstance(document, output);

            document.open();

            Font titleFont = FontFactory.getFont(
                    FontFactory.HELVETICA_BOLD, 18
            );

            Font normalFont = FontFactory.getFont(
                    FontFactory.HELVETICA, 10
            );

            Font sectionFont = FontFactory.getFont(
                    FontFactory.HELVETICA_BOLD, 12
            );

            Paragraph title = new Paragraph(
                    "RaktaSetu - Blood Request History",
                    titleFont
            );

            title.setAlignment(Element.ALIGN_CENTER);
            title.setSpacingAfter(18);
            document.add(title);

            document.add(new Paragraph(
                    "Requester: " + safe(requester.getName()),
                    normalFont
            ));

            document.add(new Paragraph(
                    "Total Requests: " + records.size(),
                    normalFont
            ));

            document.add(new Paragraph(" "));

            DateTimeFormatter formatter =
                    DateTimeFormatter.ofPattern(
                            "dd MMM yyyy, hh:mm a"
                    );

            if (records.isEmpty()) {

                document.add(new Paragraph(
                        "No blood request records found.",
                        normalFont
                ));

            } else {

                for (BloodRequest request : records) {

                    Paragraph heading = new Paragraph(
                            "Request #" + request.id,
                            sectionFont
                    );

                    heading.setSpacingBefore(12);
                    heading.setSpacingAfter(8);

                    document.add(heading);

                    PdfPTable table = new PdfPTable(2);
                    table.setWidthPercentage(100);
                    table.setWidths(new float[]{1, 2});

                    addRow(
                            table,
                            "Blood Group",
                            request.bloodGroup
                    );

                    addRow(
                            table,
                            "Hospital",
                            request.hospital
                    );

                    addRow(
                            table,
                            "City",
                            request.city
                    );

                    addRow(
                            table,
                            "Units Required",
                            String.valueOf(
                                    request.unitsRequired
                            )
                    );

                    addRow(
                            table,
                            "Urgency",
                            request.urgency
                    );

                    addRow(
                            table,
                            "Status",
                            request.status
                    );

                    addRow(
                            table,
                            "Assigned Donor",
                            request.donor == null
                                    ? "Not assigned"
                                    : request.donor.getName()
                    );

                    addRow(
                            table,
                            "Request Date",
                            request.createdAt == null
                                    ? "Not specified"
                                    : request.createdAt
                                            .format(formatter)
                    );

                    document.add(table);
                }
            }

            Paragraph disclaimer = new Paragraph(
                    "Note: This report contains records "
                    + "maintained by RaktaSetu. "
                    + "It is not a hospital-issued "
                    + "medical or transfusion certificate.",
                    normalFont
            );

            disclaimer.setSpacingBefore(22);
            document.add(disclaimer);

        } catch (Exception ex) {

            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Unable to generate PDF report",
                    ex
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
                        "attachment; filename=\"RaktaSetu-Request-History.pdf\""
                )
                .contentType(MediaType.APPLICATION_PDF)
                .contentLength(pdf.length)
                .body(pdf);
    }
}

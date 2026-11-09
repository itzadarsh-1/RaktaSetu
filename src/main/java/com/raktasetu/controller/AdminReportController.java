
package com.raktasetu.controller;

import com.raktasetu.model.BloodDonation;
import com.raktasetu.model.User;
import com.raktasetu.repository.BloodDonationRepository;

import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.hibernate.Hibernate;

import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.FontFactory;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

@RestController
@RequestMapping("/api/admin/reports")
@PreAuthorize("hasRole('ADMIN')")
public class AdminReportController {

    private final BloodDonationRepository donationRepository;

    public AdminReportController(
            BloodDonationRepository donationRepository) {
        this.donationRepository = donationRepository;
    }

    // ==========================================
    // DATE RANGE FILTER
    // ==========================================

    private List<BloodDonation> getFilteredDonations(
            LocalDate fromDate,
            LocalDate toDate) {

        if (fromDate != null && toDate != null
                && fromDate.isAfter(toDate)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "From Date cannot be after To Date"
            );
        }

        return donationRepository
                .findAllByOrderByDonationDateDesc()
                .stream()
                .filter(d -> {
                    LocalDate date = d.donationDate;

                    if (date == null) {
                        return fromDate == null && toDate == null;
                    }

                    return (fromDate == null
                            || !date.isBefore(fromDate))
                            && (toDate == null
                            || !date.isAfter(toDate));
                })
                .toList();
    }

    // ==========================================
    // DONOR DETAILS - HIBERNATE PROXY FIX
    // ==========================================

    private User getActualDonor(BloodDonation donation) {
        if (donation.donor == null) {
            return null;
        }

        return Hibernate.unproxy(
                donation.donor,
                User.class
        );
    }

    private String donorName(BloodDonation donation) {
        User donor = getActualDonor(donation);

        return donor != null && donor.name != null
                ? donor.name : "";
    }

    private String donorBloodGroup(BloodDonation donation) {
        User donor = getActualDonor(donation);

        return donor != null && donor.bloodGroup != null
                ? donor.bloodGroup : "";
    }

    private long verifiedCount(List<BloodDonation> donations) {
        return donations.stream()
                .filter(d -> "VERIFIED".equalsIgnoreCase(d.status))
                .count();
    }

    private long verifiedQuantity(List<BloodDonation> donations) {
        return donations.stream()
                .filter(d -> "VERIFIED".equalsIgnoreCase(d.status))
                .mapToLong(d -> d.quantityMl == null ? 0 : d.quantityMl)
                .sum();
    }

    private String dateRangeLabel(
            LocalDate fromDate,
            LocalDate toDate) {

        if (fromDate == null && toDate == null) {
            return "All Dates";
        }

        return (fromDate == null ? "Beginning" : fromDate.toString())
                + " to "
                + (toDate == null ? "Present" : toDate.toString());
    }

    // ==========================================
    // 1. CSV REPORT
    // ==========================================

    @GetMapping("/donations/csv")
    @Transactional(readOnly = true)
    public ResponseEntity<byte[]> downloadDonationReport(

            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate fromDate,

            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate toDate) {

        List<BloodDonation> donations =
                getFilteredDonations(fromDate, toDate);

        StringBuilder csv = new StringBuilder();

        csv.append(
                "Donation ID,Donor Name,Blood Group,"
                + "Donation Date,Quantity (mL),Hospital,"
                + "City,Status,Verified At\r\n"
        );

        for (BloodDonation donation : donations) {

            csv.append(donation.id).append(",");
            csv.append(escapeCsv(donorName(donation))).append(",");
            csv.append(escapeCsv(donorBloodGroup(donation))).append(",");
            csv.append(escapeCsv(donation.donationDate)).append(",");
            csv.append(donation.quantityMl == null
                    ? "" : donation.quantityMl).append(",");
            csv.append(escapeCsv(donation.hospital)).append(",");
            csv.append(escapeCsv(donation.city)).append(",");
            csv.append(escapeCsv(donation.status)).append(",");
            csv.append(escapeCsv(donation.verifiedAt));
            csv.append("\r\n");
        }

        byte[] bytes = ("\uFEFF" + csv)
                .getBytes(StandardCharsets.UTF_8);

        String filename =
                "RaktaSetu-Donation-Report-"
                + LocalDate.now() + ".csv";

        return ResponseEntity.ok()
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + filename + "\""
                )
                .contentType(new MediaType(
                        "text", "csv", StandardCharsets.UTF_8
                ))
                .contentLength(bytes.length)
                .body(bytes);
    }

    // ==========================================
    // 2. EXCEL REPORT
    // ==========================================

    @GetMapping("/donations/excel")
    @Transactional(readOnly = true)
    public ResponseEntity<byte[]> downloadExcelReport(

            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate fromDate,

            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate toDate) {

        List<BloodDonation> donations =
                getFilteredDonations(fromDate, toDate);

        try (
                XSSFWorkbook workbook = new XSSFWorkbook();
                ByteArrayOutputStream output =
                        new ByteArrayOutputStream()
        ) {

            Sheet sheet = workbook.createSheet("Blood Donations");

            // TITLE STYLE
            CellStyle titleStyle = workbook.createCellStyle();

            org.apache.poi.ss.usermodel.Font titleFont =
                    workbook.createFont();

            titleFont.setBold(true);
            titleFont.setFontHeightInPoints((short) 18);
            titleFont.setColor(IndexedColors.WHITE.getIndex());

            titleStyle.setFont(titleFont);
            titleStyle.setFillForegroundColor(
                    IndexedColors.DARK_RED.getIndex()
            );
            titleStyle.setFillPattern(
                    FillPatternType.SOLID_FOREGROUND
            );
            titleStyle.setAlignment(HorizontalAlignment.CENTER);
            titleStyle.setVerticalAlignment(
                    VerticalAlignment.CENTER
            );

            // HEADER STYLE
            CellStyle headerStyle = workbook.createCellStyle();

            org.apache.poi.ss.usermodel.Font headerFont =
                    workbook.createFont();

            headerFont.setBold(true);
            headerFont.setColor(IndexedColors.WHITE.getIndex());

            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(
                    IndexedColors.RED.getIndex()
            );
            headerStyle.setFillPattern(
                    FillPatternType.SOLID_FOREGROUND
            );
            headerStyle.setAlignment(
                    HorizontalAlignment.CENTER
            );

            // DATA STYLE
            CellStyle dataStyle = workbook.createCellStyle();

            dataStyle.setBorderBottom(BorderStyle.THIN);
            dataStyle.setBottomBorderColor(
                    IndexedColors.GREY_25_PERCENT.getIndex()
            );

            CreationHelper helper = workbook.getCreationHelper();

            CellStyle dateStyle = workbook.createCellStyle();
            dateStyle.cloneStyleFrom(dataStyle);
            dateStyle.setDataFormat(
                    helper.createDataFormat()
                            .getFormat("dd-mmm-yyyy")
            );

            CellStyle dateTimeStyle = workbook.createCellStyle();
            dateTimeStyle.cloneStyleFrom(dataStyle);
            dateTimeStyle.setDataFormat(
                    helper.createDataFormat()
                            .getFormat("dd-mmm-yyyy hh:mm")
            );

            // TITLE
            Row titleRow = sheet.createRow(0);
            titleRow.setHeightInPoints(35);

            Cell titleCell = titleRow.createCell(0);
            titleCell.setCellValue(
                    "RAKTASETU - BLOOD DONATION REPORT"
            );
            titleCell.setCellStyle(titleStyle);

            sheet.addMergedRegion(
                    new CellRangeAddress(0, 0, 0, 8)
            );

            // SUMMARY
            sheet.createRow(2).createCell(0).setCellValue(
                    "Generated On: " + LocalDate.now()
            );

            sheet.createRow(3).createCell(0).setCellValue(
                    "Total Donation Records: " + donations.size()
            );

            sheet.createRow(4).createCell(0).setCellValue(
                    "Verified Donations: " + verifiedCount(donations)
            );

            sheet.createRow(5).createCell(0).setCellValue(
                    "Verified Blood Quantity (mL): "
                            + verifiedQuantity(donations)
            );

            sheet.createRow(6).createCell(0).setCellValue(
                    "Date Range: " + dateRangeLabel(fromDate, toDate)
            );

            // HEADERS
            String[] columns = {
                    "Donation ID",
                    "Donor Name",
                    "Blood Group",
                    "Donation Date",
                    "Quantity (mL)",
                    "Hospital",
                    "City",
                    "Status",
                    "Verified At"
            };

            int headerRowIndex = 8;

            Row headerRow = sheet.createRow(headerRowIndex);
            headerRow.setHeightInPoints(25);

            for (int i = 0; i < columns.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(columns[i]);
                cell.setCellStyle(headerStyle);
            }

            int rowNumber = headerRowIndex + 1;

            for (BloodDonation donation : donations) {

                Row row = sheet.createRow(rowNumber++);

                Cell idCell = row.createCell(0);
                if (donation.id != null) {
                    idCell.setCellValue(donation.id.doubleValue());
                }
                idCell.setCellStyle(dataStyle);

                Cell nameCell = row.createCell(1);
                nameCell.setCellValue(
                        safeExcelText(donorName(donation))
                );
                nameCell.setCellStyle(dataStyle);

                Cell groupCell = row.createCell(2);
                groupCell.setCellValue(
                        safeExcelText(donorBloodGroup(donation))
                );
                groupCell.setCellStyle(dataStyle);

                Cell donationDateCell = row.createCell(3);
                if (donation.donationDate != null) {
                    donationDateCell.setCellValue(
                            donation.donationDate
                    );
                }
                donationDateCell.setCellStyle(dateStyle);

                Cell quantityCell = row.createCell(4);
                if (donation.quantityMl != null) {
                    quantityCell.setCellValue(
                            donation.quantityMl
                    );
                }
                quantityCell.setCellStyle(dataStyle);

                Cell hospitalCell = row.createCell(5);
                hospitalCell.setCellValue(
                        safeExcelText(donation.hospital)
                );
                hospitalCell.setCellStyle(dataStyle);

                Cell cityCell = row.createCell(6);
                cityCell.setCellValue(
                        safeExcelText(donation.city)
                );
                cityCell.setCellStyle(dataStyle);

                Cell statusCell = row.createCell(7);
                statusCell.setCellValue(
                        safeExcelText(donation.status)
                );
                statusCell.setCellStyle(dataStyle);

                Cell verifiedCell = row.createCell(8);
                if (donation.verifiedAt != null) {
                    verifiedCell.setCellValue(
                            donation.verifiedAt
                    );
                }
                verifiedCell.setCellStyle(dateTimeStyle);
            }

            int[] columnWidths = {
                    16, 25, 16, 20, 18,
                    30, 22, 18, 25
            };

            for (int i = 0; i < columnWidths.length; i++) {
                sheet.setColumnWidth(
                        i, columnWidths[i] * 256
                );
            }

            sheet.createFreezePane(0, headerRowIndex + 1);

            sheet.setAutoFilter(
                    new CellRangeAddress(
                            headerRowIndex,
                            Math.max(headerRowIndex, rowNumber - 1),
                            0,
                            columns.length - 1
                    )
            );

            workbook.write(output);

            byte[] bytes = output.toByteArray();

            String filename =
                    "RaktaSetu-Donation-Report-"
                            + LocalDate.now() + ".xlsx";

            return ResponseEntity.ok()
                    .header(
                            HttpHeaders.CONTENT_DISPOSITION,
                            "attachment; filename=\""
                                    + filename + "\""
                    )
                    .contentType(MediaType.parseMediaType(
                            "application/vnd.openxmlformats-officedocument."
                            + "spreadsheetml.sheet"
                    ))
                    .contentLength(bytes.length)
                    .body(bytes);

        } catch (Exception ex) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Unable to generate Excel report",
                    ex
            );
        }
    }

    // ==========================================
    // 3. PDF REPORT
    // ==========================================

    @GetMapping("/donations/pdf")
    @Transactional(readOnly = true)
    public ResponseEntity<byte[]> downloadPdfReport(

            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate fromDate,

            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate toDate) {

        List<BloodDonation> donations =
                getFilteredDonations(fromDate, toDate);

        ByteArrayOutputStream output =
                new ByteArrayOutputStream();

        Document document = new Document(
                PageSize.A4.rotate(),
                30, 30, 35, 35
        );

        try {
            PdfWriter.getInstance(document, output);
            document.open();

            com.lowagie.text.Font titleFont =
                    FontFactory.getFont(
                            FontFactory.HELVETICA_BOLD,
                            18,
                            Color.WHITE
                    );

            com.lowagie.text.Font normalFont =
                    FontFactory.getFont(
                            FontFactory.HELVETICA,
                            10,
                            Color.DARK_GRAY
                    );

            com.lowagie.text.Font headerFont =
                    FontFactory.getFont(
                            FontFactory.HELVETICA_BOLD,
                            9,
                            Color.WHITE
                    );

            com.lowagie.text.Font cellFont =
                    FontFactory.getFont(
                            FontFactory.HELVETICA,
                            8,
                            Color.BLACK
                    );

            // TITLE
            PdfPTable titleTable = new PdfPTable(1);
            titleTable.setWidthPercentage(100);

            PdfPCell titleCell = new PdfPCell(
                    new Phrase(
                            "RAKTASETU - BLOOD DONATION REPORT",
                            titleFont
                    )
            );

            titleCell.setBackgroundColor(
                    new Color(153, 0, 0)
            );
            titleCell.setHorizontalAlignment(
                    Element.ALIGN_CENTER
            );
            titleCell.setVerticalAlignment(
                    Element.ALIGN_MIDDLE
            );
            titleCell.setPadding(14);
            titleCell.setBorder(0);

            titleTable.addCell(titleCell);
            document.add(titleTable);

            document.add(new Paragraph(" "));

            // SUMMARY
            document.add(new Paragraph(
                    "Generated On: " + LocalDate.now(),
                    normalFont
            ));

            document.add(new Paragraph(
                    "Date Range: "
                            + dateRangeLabel(fromDate, toDate),
                    normalFont
            ));

            document.add(new Paragraph(
                    "Total Donation Records: " + donations.size(),
                    normalFont
            ));

            document.add(new Paragraph(
                    "Verified Donations: "
                            + verifiedCount(donations),
                    normalFont
            ));

            document.add(new Paragraph(
                    "Verified Blood Quantity: "
                            + verifiedQuantity(donations)
                            + " mL",
                    normalFont
            ));

            document.add(new Paragraph(" "));

            // TABLE
            String[] headers = {
                    "Donation ID",
                    "Donor Name",
                    "Blood Group",
                    "Donation Date",
                    "Quantity (mL)",
                    "Hospital",
                    "City",
                    "Status",
                    "Verified At"
            };

            PdfPTable table = new PdfPTable(headers.length);
            table.setWidthPercentage(100);
            table.setHeaderRows(1);

            table.setWidths(new float[]{
                    1.1f, 2.1f, 1.2f,
                    1.6f, 1.4f, 2.1f,
                    1.5f, 1.3f, 2.0f
            });

            for (String header : headers) {

                PdfPCell cell = new PdfPCell(
                        new Phrase(header, headerFont)
                );

                cell.setBackgroundColor(
                        new Color(220, 0, 35)
                );
                cell.setPadding(8);
                cell.setHorizontalAlignment(
                        Element.ALIGN_CENTER
                );

                table.addCell(cell);
            }

            DateTimeFormatter dateFormat =
                    DateTimeFormatter.ofPattern(
                            "dd-MMM-yyyy"
                    );

            DateTimeFormatter dateTimeFormat =
                    DateTimeFormatter.ofPattern(
                            "dd-MMM-yyyy HH:mm"
                    );

            int rowIndex = 0;

            for (BloodDonation donation : donations) {

                String[] values = {
                        String.valueOf(donation.id),
                        donorName(donation),
                        donorBloodGroup(donation),

                        donation.donationDate == null
                                ? ""
                                : donation.donationDate
                                        .format(dateFormat),

                        donation.quantityMl == null
                                ? ""
                                : String.valueOf(
                                        donation.quantityMl
                                ),

                        donation.hospital == null
                                ? ""
                                : donation.hospital,

                        donation.city == null
                                ? ""
                                : donation.city,

                        donation.status == null
                                ? ""
                                : donation.status,

                        donation.verifiedAt == null
                                ? ""
                                : donation.verifiedAt
                                        .format(dateTimeFormat)
                };

                Color rowColor =
                        rowIndex % 2 == 0
                                ? Color.WHITE
                                : new Color(245, 247, 250);

                for (String value : values) {

                    PdfPCell cell = new PdfPCell(
                            new Phrase(value, cellFont)
                    );

                    cell.setBackgroundColor(rowColor);
                    cell.setPadding(7);
                    cell.setVerticalAlignment(
                            Element.ALIGN_MIDDLE
                    );

                    table.addCell(cell);
                }

                rowIndex++;
            }

            document.add(table);
            document.add(new Paragraph(" "));

            document.add(new Paragraph(
                    "Note: Only VERIFIED donations are "
                    + "included in confirmed donation totals.",
                    normalFont
            ));

            document.close();

        } catch (Exception ex) {

            if (document.isOpen()) {
                document.close();
            }

            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Unable to generate PDF report",
                    ex
            );
        }

        byte[] bytes = output.toByteArray();

        String filename =
                "RaktaSetu-Donation-Report-"
                        + LocalDate.now() + ".pdf";

        return ResponseEntity.ok()
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\""
                                + filename + "\""
                )
                .contentType(MediaType.APPLICATION_PDF)
                .contentLength(bytes.length)
                .body(bytes);
    }

    // ==========================================
    // CSV ESCAPING
    // ==========================================

    private String escapeCsv(Object value) {

        if (value == null) {
            return "\"\"";
        }

        String text = String.valueOf(value);

        if (!text.isEmpty()
                && (text.charAt(0) == '='
                || text.charAt(0) == '+'
                || text.charAt(0) == '-'
                || text.charAt(0) == '@'
                || text.charAt(0) == '\t'
                || text.charAt(0) == '\r'
                || text.charAt(0) == '\n')) {
            text = "'" + text;
        }

        return "\"" + text.replace("\"", "\"\"") + "\"";
    }

    // ==========================================
    // EXCEL FORMULA PROTECTION
    // ==========================================

    private String safeExcelText(String value) {

        if (value == null) {
            return "";
        }

        if (!value.isEmpty()
                && (value.charAt(0) == '='
                || value.charAt(0) == '+'
                || value.charAt(0) == '-'
                || value.charAt(0) == '@'
                || value.charAt(0) == '\t'
                || value.charAt(0) == '\r'
                || value.charAt(0) == '\n')) {
            return "'" + value;
        }

        return value;
    }
}

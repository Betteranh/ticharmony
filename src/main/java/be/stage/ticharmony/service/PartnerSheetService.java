package be.stage.ticharmony.service;

import be.stage.ticharmony.model.*;
import be.stage.ticharmony.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class PartnerSheetService {

    private final PartnerSheetRepository sheetRepository;
    private final PartnerSectionRepository sectionRepository;
    private final PartnerEntryRepository entryRepository;

    @Transactional
    public PartnerSheet getOrCreateSheet(User partner) {
        PartnerSheet sheet = sheetRepository.findByPartner(partner)
                .orElseGet(() -> {
                    PartnerSheet s = new PartnerSheet();
                    s.setPartner(partner);
                    return sheetRepository.save(s);
                });
        // Initialize lazy collections within the transaction so Thymeleaf can access them
        sheet.getSections().size();
        sheet.getSections().forEach(sec -> sec.getEntries().size());
        return sheet;
    }

    public Optional<PartnerSection> findSection(Long id) {
        return sectionRepository.findById(id);
    }

    public Optional<PartnerEntry> findEntry(Long id) {
        return entryRepository.findById(id);
    }

    @Transactional
    public void addSection(PartnerSheet sheet, String icon, String title) {
        PartnerSheet managed = sheetRepository.findById(sheet.getId()).orElse(sheet);
        PartnerSection section = new PartnerSection();
        section.setSheet(managed);
        section.setIcon(icon != null && !icon.isBlank() ? icon.trim() : null);
        section.setTitle(title.trim());
        section.setSortOrder(managed.getSections().size());
        sectionRepository.save(section);
    }

    @Transactional
    public void updateSection(PartnerSection section, String icon, String title) {
        section.setIcon(icon != null && !icon.isBlank() ? icon.trim() : null);
        section.setTitle(title.trim());
        sectionRepository.save(section);
    }

    @Transactional
    public void deleteSection(PartnerSection section) {
        sectionRepository.delete(section);
    }

    @Transactional
    public void addEntry(PartnerSection section, String label, String value, boolean isPassword) {
        PartnerSection managed = sectionRepository.findById(section.getId()).orElse(section);
        PartnerEntry entry = new PartnerEntry();
        entry.setSection(managed);
        entry.setLabel(label.trim());
        entry.setValue(value != null ? value.trim() : "");
        entry.setPassword(isPassword);
        entry.setSortOrder(managed.getEntries().size());
        entryRepository.save(entry);
    }

    @Transactional
    public void updateEntry(PartnerEntry entry, String label, String value, boolean isPassword) {
        entry.setLabel(label.trim());
        entry.setValue(value != null ? value.trim() : "");
        entry.setPassword(isPassword);
        entryRepository.save(entry);
    }

    @Transactional
    public void deleteEntry(PartnerEntry entry) {
        entryRepository.delete(entry);
    }

    @Transactional
    public void saveNotes(PartnerSheet sheet, String notes) {
        sheet.setNotes(notes != null ? notes.trim() : null);
        sheetRepository.save(sheet);
    }
}
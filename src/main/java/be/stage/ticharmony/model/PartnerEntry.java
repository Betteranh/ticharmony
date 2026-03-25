package be.stage.ticharmony.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "partner_entries")
@Getter
@Setter
public class PartnerEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "section_id", nullable = false)
    private PartnerSection section;

    @Column(nullable = false, length = 100)
    private String label;

    @Column(columnDefinition = "TEXT")
    private String value;

    @Column(name = "is_password", nullable = false)
    private boolean password = false;

    @Column(nullable = false)
    private int sortOrder = 0;
}
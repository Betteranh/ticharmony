package be.stage.ticharmony.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.BatchSize;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "partner_sections")
@Getter
@Setter
public class PartnerSection {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sheet_id", nullable = false)
    private PartnerSheet sheet;

    @Column(nullable = false, length = 100)
    private String title;

    @Column(length = 10)
    private String icon;

    @Column(nullable = false)
    private int sortOrder = 0;

    @OneToMany(mappedBy = "section", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC, id ASC")
    @BatchSize(size = 30)
    private List<PartnerEntry> entries = new ArrayList<>();
}
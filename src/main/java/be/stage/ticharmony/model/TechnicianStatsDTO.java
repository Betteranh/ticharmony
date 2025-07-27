package be.stage.ticharmony.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TechnicianStatsDTO {
    private Long technicianId;
    private String technicianName;
    private long ticketCount;
}

package be.stage.ticharmony.repository;

import be.stage.ticharmony.model.Problem;
import org.springframework.data.repository.CrudRepository;

public interface ProblemRepository extends CrudRepository<Problem, Long> {

}

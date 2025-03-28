package be.stage.ticharmony.repository;

import be.stage.ticharmony.model.Problem;
import be.stage.ticharmony.model.User;
import org.springframework.data.repository.CrudRepository;

import java.util.List;

public interface ProblemRepository extends CrudRepository<Problem, Long> {
    List<Problem> findByUser(User user);
}

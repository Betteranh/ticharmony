package be.stage.ticharmony.repository;

import be.stage.ticharmony.model.Comment;
import be.stage.ticharmony.model.Problem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CommentRepository extends JpaRepository<Comment, Long> {
    List<Comment> findByProblemOrderByCreatedAtAsc(Problem problem);
}

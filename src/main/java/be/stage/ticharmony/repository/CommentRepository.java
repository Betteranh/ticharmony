package be.stage.ticharmony.repository;

import be.stage.ticharmony.model.Comment;
import be.stage.ticharmony.model.Problem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface CommentRepository extends JpaRepository<Comment, Long> {

    @Query("SELECT c FROM Comment c JOIN FETCH c.author WHERE c.problem = ?1 ORDER BY c.createdAt ASC")
    List<Comment> findByProblemOrderByCreatedAtAsc(Problem problem);

    @Query("SELECT c FROM Comment c JOIN FETCH c.author WHERE c.problem = ?1 AND c.id > ?2 ORDER BY c.createdAt ASC")
    List<Comment> findByProblemAndIdGreaterThanOrderByCreatedAtAsc(Problem problem, Long id);
}

package com.proj.backendrunninglate.repositories;

import com.proj.backendrunninglate.models.PastRun;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PastRunRepository extends JpaRepository<PastRun, Long> {

    List<PastRun> findByAccountEmail(String email);

}

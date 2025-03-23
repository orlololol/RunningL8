package com.proj.backendrunninglate.repositories;

import com.proj.backendrunninglate.models.ActiveRun;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ActiveRunRepository extends JpaRepository<ActiveRun, Long> {

}

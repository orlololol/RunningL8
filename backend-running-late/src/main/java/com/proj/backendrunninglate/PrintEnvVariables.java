package com.proj.backendrunninglate;

import org.springframework.boot.CommandLineRunner;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.lang.management.ManagementFactory;

@Component
public class PrintEnvVariables implements CommandLineRunner {

    private final Environment env;

    public PrintEnvVariables(Environment env) {
        this.env = env;
    }

    @Override
    public void run(String... args) throws Exception {
        System.out.println("SPRING_DATASOURCE_URL: " + env.getProperty("SPRING_DATASOURCE_URL"));
        System.out.println("SPRING_DATASOURCE_USERNAME: " + env.getProperty("SPRING_DATASOURCE_USERNAME"));
        System.out.println("SPRING_DATASOURCE_PASSWORD: " + env.getProperty("SPRING_DATASOURCE_PASSWORD"));
        String pid = ManagementFactory.getRuntimeMXBean().getName().split("@")[0];
        System.out.println("Application PID: " + pid);
    }
}
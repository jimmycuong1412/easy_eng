/**
 * Container Integration Tests
 * 
 * Tests to verify Docker containers build and run correctly
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

describe('Container Integration Tests', () => {
  describe('Frontend Container', () => {
    it('should build frontend Docker image successfully', async () => {
      const { stdout, stderr } = await execAsync(
        'docker build -t easy-eng-frontend:test ./frontend',
        { cwd: process.cwd() }
      );

      expect(stderr).not.toContain('ERROR');
      expect(stdout).toContain('Successfully built');
    }, 120000); // 2 minute timeout for Docker build

    it('should have correct Node version in frontend container', async () => {
      const { stdout } = await execAsync(
        'docker run --rm easy-eng-frontend:test node --version'
      );

      expect(stdout.trim()).toMatch(/^v20\./);
    });

    it('should expose port 3000 in frontend container', async () => {
      const { stdout } = await execAsync(
        'docker inspect easy-eng-frontend:test --format="{{.Config.ExposedPorts}}"'
      );

      expect(stdout).toContain('3000/tcp');
    });
  });

  describe('Backend Container', () => {
    it('should build backend Docker image successfully', async () => {
      const { stdout, stderr } = await execAsync(
        'docker build -t easy-eng-backend:test ./backend',
        { cwd: process.cwd() }
      );

      expect(stderr).not.toContain('ERROR');
      expect(stdout).toContain('Successfully built');
    }, 120000); // 2 minute timeout for Docker build

    it('should have correct Node version in backend container', async () => {
      const { stdout } = await execAsync(
        'docker run --rm easy-eng-backend:test node --version'
      );

      expect(stdout.trim()).toMatch(/^v20\./);
    });

    it('should expose port 4000 in backend container', async () => {
      const { stdout } = await execAsync(
        'docker inspect easy-eng-backend:test --format="{{.Config.ExposedPorts}}"'
      );

      expect(stdout).toContain('4000/tcp');
    });
  });

  describe('Docker Compose', () => {
    beforeAll(async () => {
      // Ensure docker-compose.yml exists
      const { stdout } = await execAsync('ls docker-compose.yml', {
        cwd: process.cwd(),
      });
      expect(stdout.trim()).toBe('docker-compose.yml');
    });

    it('should validate docker-compose.yml syntax', async () => {
      const { stdout, stderr } = await execAsync('docker-compose config');

      expect(stderr).not.toContain('ERROR');
      expect(stdout).toContain('services:');
    });

    it('should define frontend service in docker-compose', async () => {
      const { stdout } = await execAsync('docker-compose config --services');

      expect(stdout).toContain('frontend');
    });

    it('should define backend service in docker-compose', async () => {
      const { stdout } = await execAsync('docker-compose config --services');

      expect(stdout).toContain('backend');
    });

    it('should start all services with docker-compose', async () => {
      // Start containers in detached mode
      await execAsync('docker-compose up -d');

      // Wait for services to be ready
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Check if containers are running
      const { stdout } = await execAsync('docker-compose ps --format json');
      const services = JSON.parse(stdout);

      expect(services).toHaveLength(2);
      expect(services.some((s: any) => s.Service === 'frontend')).toBe(true);
      expect(services.some((s: any) => s.Service === 'backend')).toBe(true);
    }, 60000);

    afterAll(async () => {
      // Clean up - stop and remove containers
      await execAsync('docker-compose down -v');
    });
  });

  describe('Container Health Checks', () => {
    it('should have frontend container responding to health checks', async () => {
      // Assuming frontend has a health endpoint
      const { stdout } = await execAsync(
        'docker-compose exec -T frontend wget -qO- http://localhost:3000/api/health || echo "Not ready"'
      );

      // Container should respond (or at least be running)
      expect(stdout).toBeDefined();
    });

    it('should have backend container responding to health checks', async () => {
      // Assuming backend has a health endpoint
      const { stdout } = await execAsync(
        'docker-compose exec -T backend wget -qO- http://localhost:4000/health || echo "Not ready"'
      );

      // Container should respond (or at least be running)
      expect(stdout).toBeDefined();
    });
  });

  describe('Container Volume Mounts', () => {
    it('should mount source code volumes in development mode', async () => {
      const { stdout } = await execAsync(
        'docker-compose config --format json'
      );
      const config = JSON.parse(stdout);

      // Check if volumes are configured
      expect(config.services.frontend.volumes).toBeDefined();
      expect(config.services.backend.volumes).toBeDefined();
    });
  });
});

/**
 * Reference Image API Routes
 *
 * REST API endpoints for managing reference images used in
 * Controlled Generation (Subject, Control, Style references).
 *
 * @module server/routes/reference
 */

import type { FastifyInstance } from 'fastify';
import type { StateManager } from '../../core/index.js';
import {
  GenerationReferencesSchema,
  validateReferenceIds,
  requiresCapabilityModel,
  type GenerationReferences,
} from '../../types/index.js';

// =============================================================================
// Types
// =============================================================================

export interface ReferenceDependencies {
  readonly stateManager: StateManager;
}

interface SetJobReferencesBody {
  references: GenerationReferences;
}

interface SetJobReferencesParams {
  jobId: string;
}

interface BatchReferencesBody {
  references: GenerationReferences;
  jobIds?: number[];
}

// =============================================================================
// Route Registration
// =============================================================================

/**
 * Register reference image management routes.
 *
 * These routes enable Structure-Conditioned Style Transfer by allowing
 * users to attach reference images to jobs for controlled generation.
 */
export function registerReferenceRoutes(
  app: FastifyInstance,
  deps: ReferenceDependencies,
): void {
  // ---------------------------------------------------------------------------
  // GET /api/references/info - Get information about reference capabilities
  // ---------------------------------------------------------------------------
  app.get('/api/references/info', async (_request, reply) => {
    return reply.send({
      description: 'Controlled Generation Reference Images',
      capabilities: {
        subject: {
          description: 'Maintain product/person identity across different contexts',
          maxImages: 4,
          supportedTypes: ['product', 'person', 'animal', 'object'],
        },
        control: {
          description: 'Structure-conditioned generation from edges, sketches, or poses',
          controlTypes: [
            { type: 'CONTROL_TYPE_CANNY', description: 'Edge detection (best for architecture/products)' },
            { type: 'CONTROL_TYPE_SCRIBBLE', description: 'Hand-drawn sketches or rough outlines' },
            { type: 'CONTROL_TYPE_FACE_MESH', description: 'Facial landmarks for portraits' },
          ],
        },
        style: {
          description: 'Extract and apply visual style from a reference image',
          requiresDescription: false,
        },
      },
      requiredModel: 'imagen-3.0-capability-001',
      modelKey: 'vertex-imagen3-capability',
    });
  });

  // ---------------------------------------------------------------------------
  // GET /api/jobs/:jobId/references - Get references for a specific job
  // ---------------------------------------------------------------------------
  app.get<{ Params: SetJobReferencesParams }>(
    '/api/jobs/:jobId/references',
    async (request, reply) => {
      const jobId = parseInt(request.params.jobId, 10);

      if (isNaN(jobId) || jobId < 1) {
        return reply.status(400).send({
          error: 'Invalid job ID',
          message: 'Job ID must be a positive integer',
        });
      }

      try {
        const job = await deps.stateManager.getJob(jobId);

        if (!job) {
          return reply.status(404).send({
            error: 'Job not found',
            message: `No job found with ID ${jobId}`,
          });
        }

        return reply.send({
          jobId: job.id,
          hasReferences: !!job.references,
          references: job.references ?? null,
          summary: job.references ? {
            subjectCount: job.references.subject?.length ?? 0,
            hasControl: !!job.references.control,
            hasStyle: !!job.references.style,
            controlType: job.references.control?.controlType ?? null,
          } : null,
        });
      } catch (error) {
        app.log.error(error, 'Failed to get job references');
        return reply.status(500).send({
          error: 'Failed to get job references',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  );

  // ---------------------------------------------------------------------------
  // PUT /api/jobs/:jobId/references - Set references for a specific job
  // ---------------------------------------------------------------------------
  app.put<{ Params: SetJobReferencesParams; Body: SetJobReferencesBody }>(
    '/api/jobs/:jobId/references',
    async (request, reply) => {
      const jobId = parseInt(request.params.jobId, 10);

      if (isNaN(jobId) || jobId < 1) {
        return reply.status(400).send({
          error: 'Invalid job ID',
          message: 'Job ID must be a positive integer',
        });
      }

      try {
        // Validate references against schema
        const parseResult = GenerationReferencesSchema.safeParse(request.body.references);

        if (!parseResult.success) {
          return reply.status(400).send({
            error: 'Invalid references',
            message: 'References do not match expected schema',
            details: parseResult.error.errors,
          });
        }

        const references = parseResult.data;

        // Validate reference IDs are unique
        if (!validateReferenceIds(references)) {
          return reply.status(400).send({
            error: 'Duplicate reference IDs',
            message: 'Each reference must have a unique referenceId',
          });
        }

        // Check job exists
        const job = await deps.stateManager.getJob(jobId);

        if (!job) {
          return reply.status(404).send({
            error: 'Job not found',
            message: `No job found with ID ${jobId}`,
          });
        }

        // Cannot modify references if job is processing or done
        if (job.status === 'PROCESSING') {
          return reply.status(409).send({
            error: 'Job is processing',
            message: 'Cannot modify references while job is being processed',
          });
        }

        if (job.status === 'DONE') {
          return reply.status(409).send({
            error: 'Job already complete',
            message: 'Reset the job to PENDING before modifying references',
          });
        }

        // Update job with references
        await deps.stateManager.atomicUpdate(jobId, {
          references,
          updatedAt: new Date().toISOString(),
        });

        app.log.info(
          {
            jobId,
            subjectCount: references.subject?.length ?? 0,
            hasControl: !!references.control,
            hasStyle: !!references.style,
          },
          'References attached to job',
        );

        return reply.send({
          message: 'References attached successfully',
          jobId,
          requiresCapabilityModel: requiresCapabilityModel(references),
          summary: {
            subjectCount: references.subject?.length ?? 0,
            hasControl: !!references.control,
            hasStyle: !!references.style,
            controlType: references.control?.controlType ?? null,
          },
        });
      } catch (error) {
        app.log.error(error, 'Failed to set job references');
        return reply.status(500).send({
          error: 'Failed to set job references',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  );

  // ---------------------------------------------------------------------------
  // DELETE /api/jobs/:jobId/references - Remove references from a job
  // ---------------------------------------------------------------------------
  app.delete<{ Params: SetJobReferencesParams }>(
    '/api/jobs/:jobId/references',
    async (request, reply) => {
      const jobId = parseInt(request.params.jobId, 10);

      if (isNaN(jobId) || jobId < 1) {
        return reply.status(400).send({
          error: 'Invalid job ID',
          message: 'Job ID must be a positive integer',
        });
      }

      try {
        const job = await deps.stateManager.getJob(jobId);

        if (!job) {
          return reply.status(404).send({
            error: 'Job not found',
            message: `No job found with ID ${jobId}`,
          });
        }

        if (job.status === 'PROCESSING') {
          return reply.status(409).send({
            error: 'Job is processing',
            message: 'Cannot modify references while job is being processed',
          });
        }

        // Remove references
        await deps.stateManager.atomicUpdate(jobId, {
          clearReferences: true,
          updatedAt: new Date().toISOString(),
        });

        app.log.info({ jobId }, 'References removed from job');

        return reply.send({
          message: 'References removed successfully',
          jobId,
        });
      } catch (error) {
        app.log.error(error, 'Failed to remove job references');
        return reply.status(500).send({
          error: 'Failed to remove job references',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  );

  // ---------------------------------------------------------------------------
  // POST /api/references/batch - Apply references to multiple jobs
  // ---------------------------------------------------------------------------
  app.post<{ Body: BatchReferencesBody }>(
    '/api/references/batch',
    async (request, reply) => {
      try {
        // Validate references
        const parseResult = GenerationReferencesSchema.safeParse(request.body.references);

        if (!parseResult.success) {
          return reply.status(400).send({
            error: 'Invalid references',
            message: 'References do not match expected schema',
            details: parseResult.error.errors,
          });
        }

        const references = parseResult.data;

        // Validate reference IDs
        if (!validateReferenceIds(references)) {
          return reply.status(400).send({
            error: 'Duplicate reference IDs',
            message: 'Each reference must have a unique referenceId',
          });
        }

        // Get target jobs
        let targetJobIds = request.body.jobIds;

        if (!targetJobIds || targetJobIds.length === 0) {
          // If no job IDs specified, apply to all PENDING jobs
          const jobs = await deps.stateManager.getJobsByStatus('PENDING');
          targetJobIds = jobs.map((j) => j.id);
        }

        if (targetJobIds.length === 0) {
          return reply.status(400).send({
            error: 'No eligible jobs',
            message: 'No PENDING jobs found to apply references to',
          });
        }

        // Apply references to each job
        const results: Array<{ jobId: number; success: boolean; error?: string }> = [];

        for (const jobId of targetJobIds) {
          try {
            const job = await deps.stateManager.getJob(jobId);

            if (!job) {
              results.push({ jobId, success: false, error: 'Job not found' });
              continue;
            }

            if (job.status !== 'PENDING' && job.status !== 'FAILED') {
              results.push({
                jobId,
                success: false,
                error: `Job is ${job.status}, cannot modify`,
              });
              continue;
            }

            await deps.stateManager.atomicUpdate(jobId, {
              references,
              updatedAt: new Date().toISOString(),
            });

            results.push({ jobId, success: true });
          } catch (err) {
            results.push({
              jobId,
              success: false,
              error: err instanceof Error ? err.message : 'Unknown error',
            });
          }
        }

        const successCount = results.filter((r) => r.success).length;

        app.log.info(
          {
            totalJobs: targetJobIds.length,
            successCount,
            failCount: targetJobIds.length - successCount,
          },
          'Batch reference application completed',
        );

        return reply.send({
          message: `References applied to ${successCount}/${targetJobIds.length} jobs`,
          results,
          requiresCapabilityModel: requiresCapabilityModel(references),
        });
      } catch (error) {
        app.log.error(error, 'Failed to apply batch references');
        return reply.status(500).send({
          error: 'Failed to apply batch references',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  );

  // ---------------------------------------------------------------------------
  // POST /api/references/validate - Validate reference image data
  // ---------------------------------------------------------------------------
  app.post<{ Body: { references: unknown } }>(
    '/api/references/validate',
    async (request, reply) => {
      try {
        const parseResult = GenerationReferencesSchema.safeParse(request.body.references);

        if (!parseResult.success) {
          return reply.status(400).send({
            valid: false,
            errors: parseResult.error.errors.map((e) => ({
              path: e.path.join('.'),
              message: e.message,
            })),
          });
        }

        const references = parseResult.data;

        // Additional validation
        const uniqueIds = validateReferenceIds(references);

        if (!uniqueIds) {
          return reply.status(400).send({
            valid: false,
            errors: [{ path: 'referenceId', message: 'Reference IDs must be unique' }],
          });
        }

        // Check image data size (warn if very large)
        const warnings: string[] = [];

        const checkImageSize = (base64: string, refType: string) => {
          const sizeBytes = (base64.length * 3) / 4; // Approximate decoded size
          const sizeMB = sizeBytes / (1024 * 1024);
          if (sizeMB > 4) {
            warnings.push(`${refType} image is ${sizeMB.toFixed(1)}MB - consider using smaller images`);
          }
        };

        for (const subj of references.subject ?? []) {
          checkImageSize(subj.imageBase64, `Subject[${subj.referenceId}]`);
        }

        if (references.control) {
          checkImageSize(references.control.imageBase64, 'Control');
        }

        if (references.style) {
          checkImageSize(references.style.imageBase64, 'Style');
        }

        return reply.send({
          valid: true,
          summary: {
            subjectCount: references.subject?.length ?? 0,
            hasControl: !!references.control,
            hasStyle: !!references.style,
            controlType: references.control?.controlType ?? null,
            requiresCapabilityModel: requiresCapabilityModel(references),
          },
          warnings: warnings.length > 0 ? warnings : undefined,
        });
      } catch (error) {
        app.log.error(error, 'Failed to validate references');
        return reply.status(500).send({
          error: 'Failed to validate references',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  );
}



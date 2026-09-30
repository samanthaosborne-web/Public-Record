/**
 * Structured local database (prototype).
 *
 * Each JSON file corresponds to a table in supabase/schema.sql. Records are
 * append-only in spirit: superseded assessments remain here and are linked
 * from their successors; material changes are logged in change-log.json.
 */
import type { Dataset } from "@/lib/types";
import parties from "./parties.json";
import politicians from "./politicians.json";
import sources from "./sources.json";
import claims from "./claims.json";
import claimAssessments from "./claim-assessments.json";
import claimSources from "./claim-sources.json";
import claimRepetitions from "./claim-repetitions.json";
import corrections from "./corrections.json";
import integrityMatters from "./integrity-matters.json";
import conductMatters from "./conduct-matters.json";
import responses from "./responses.json";
import issues from "./issues.json";
import dailyUpdates from "./daily-updates.json";
import reviewQueue from "./review-queue.json";
import changeLog from "./change-log.json";

export const dataset: Dataset = {
  parties: parties as Dataset["parties"],
  politicians: politicians as Dataset["politicians"],
  sources: sources as Dataset["sources"],
  claims: claims as Dataset["claims"],
  claimAssessments: claimAssessments as Dataset["claimAssessments"],
  claimSources: claimSources as Dataset["claimSources"],
  claimRepetitions: claimRepetitions as Dataset["claimRepetitions"],
  corrections: corrections as Dataset["corrections"],
  integrityMatters: integrityMatters as Dataset["integrityMatters"],
  conductMatters: conductMatters as Dataset["conductMatters"],
  responses: responses as Dataset["responses"],
  issues: issues as Dataset["issues"],
  dailyUpdates: dailyUpdates as Dataset["dailyUpdates"],
  reviewQueue: reviewQueue as Dataset["reviewQueue"],
  changeLog: changeLog as Dataset["changeLog"],
};

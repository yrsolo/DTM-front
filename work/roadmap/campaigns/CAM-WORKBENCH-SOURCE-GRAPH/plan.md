# CAM-WORKBENCH-SOURCE-GRAPH Plan

- define `SourceNode` and `SourceGraph`
- define parse-stage outputs and enrich-stage outputs
- design source-to-runtime projection mapping
- define how source analysis produces canonical identity for component definitions and placements
- define and follow canonical placement normalization policy before `SourceNodeId` generation
- define and follow canonical symbol resolution policy before import/export graph continuation
- define and follow unified source continuation policy for checker-based continuation, ambiguity fallback, cycle handling, and dedup
- define and follow source-graph delivery/projection policy for snapshot transport, slicing, and source/runtime bridging
- define and follow source/runtime binding policy for explicit binding tables, statuses, reverse pick resolution, and id-based rebinding

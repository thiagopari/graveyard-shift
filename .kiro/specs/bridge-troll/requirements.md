# Requirements: bridge-troll (EARS)

Bridge Troll replays the July 10-11, 2023 Vermont flood. It is a demo, not an engineering assessment.

## R1 Public data only
1.1 The data bake script shall fetch only from public sources: the USGS NWIS web services, the NWS NWPS API and the FHWA National Bridge Inventory (NBI) Vermont 2023 file.
1.2 The bake script shall write every dataset to `bridge-troll/data/*.json` and shall write `bridge-troll/data/sources.json` with the URL, retrieval date and licence of every file.
1.3 If a source cannot be reached or returns no usable data, then the bake script shall stop that part, shall keep no partial file for it, and shall report the failure.
1.4 The system shall not invent, interpolate or extrapolate data values.

## R2 Gauges
2.1 The bake script shall keep a candidate gauge (04286000, 04290500, 04292500) only if the USGS API returns a series for it in Jul 8-14 2023 and the NWS API lists it with at least one usable flood category.
2.2 The bake script shall record which candidates were dropped and why.
2.3 The system shall use whichever of stage (ft) or discharge (cfs) has more published NWS thresholds for a gauge, preferring stage on a tie, and shall say which one it uses.
2.4 Where the NWS does not publish a category threshold, the system shall treat that category as unknown and shall say so on screen.

## R3 Bridges
3.1 The bake script shall select up to 60 NBI Vermont bridges whose feature crossed is the Winooski River or the Lamoille River and that lie within 25 km of a kept gauge on the same river.
3.2 For each bridge the bake script shall keep structure number, latitude, longitude, year built, deck, superstructure and substructure ratings, scour-critical code (item 113) and ADT.
3.3 The system shall assign each bridge to the nearest kept gauge on its river.

## R4 Replay
4.1 When the user moves the time slider, the system shall show each bridge's triage at that time.
4.2 The system shall read the gauge value as the latest observation at or before the slider time and shall not interpolate between observations.
4.3 If the latest observation is more than 6 hours older than the slider time, or none exists, then the system shall add a blocking check, shall give the bridge no score, and shall ask for a fresh gauge reading.

## R5 Triage
5.1 The system shall map each bridge to exactly one of Needs you, Watch, Fine, using the skeleton Triage.
5.2 The system shall derive risk from the gauge value against the flood categories, the scour-critical code and the substructure rating.
5.3 For a fixed bridge, a higher gauge value shall never lower the bridge's priority.
5.4 The system shall not rely on colour alone: every card shows the level text.

## R6 Evidence
6.1 Every card shall cite the gauge ID and observation timestamp, the NWS category source, and the NBI structure number.
6.2 Every cited source shall appear in `sources.json`.

## R7 Export and footer
7.1 When the user presses export, the system shall download a Markdown report of the cards at the slider time.
7.2 The page footer shall read "Demo replay, not an engineering assessment."

## R8 Accessibility
8.1 The inbox shall be a labelled section, each card an article with a heading, and a live region shall announce the counts after the slider changes.
8.2 The slider shall be keyboard operable, and motion shall respect `prefers-reduced-motion`.

## R9 Pages build
9.1 `npm run build` shall emit one `dist/` with a dark landing page that explains the template and links `mussel-memory/` and `bridge-troll/` by relative paths.

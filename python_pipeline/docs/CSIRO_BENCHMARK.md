# Structural validation against the CSIRO Murray–Darling Basin accounts

Source: CSIRO, *Experimental ecosystem accounts for the Murray–Darling Basin*
(last updated 7 Feb 2025), funded by the Australian Government DCCEEW under the
*Environmental Economic Accounting: A common national approach*.
<https://www.csiro.au/en/research/natural-environment/natural-resources/Natural-capital-accounting/Murray-Darling-Basin>

The benchmark is used as a **structural** reference (account architecture,
condition convention, service set), not for direct transfer of monetary values
— consistent with the manuscript.

| Dimension | CSIRO MDB accounts | SEEA-AI (this work) | Correspondence |
|---|---|---|---|
| Condition metric | Index 0–1 (1 = high integrity) | C∈[0,1] from NDVI normalisation | ✔ same convention |
| Accounts compiled | extent, condition, biodiversity, services | extent, condition, physical & monetary flows, assets | ✔ |
| Services | carbon storage/seq., water & sediment retention, biomass, recreation | carbon, sediment retention (extensible) | ✔ subset |
| Spatial unit | basin / ecosystem type | gridded bbox aggregated to territory | ✔ |
| Temporal | annual financial-year accounts | annual epochs (2020, 2026) | ✔ |
| Biodiversity trend (MDB) | plant persistence 86.8%→87.1% (2010–15) | not modelled (out of scope) | n/a |

**Validation logic.** SEEA-AI must (i) reproduce the *functional* relationship
condition → service flow → value, (ii) keep estimated values within the order of
magnitude expected for landscapes of comparable extent and condition, and
(iii) preserve the SEEA-EA accounting identities (assets = NPV of flows; ΔK as
depreciation/accumulation). The Murrumbidgee run is the calibration anchor; the
three transfer sites test generalisation without site-specific recalibration.

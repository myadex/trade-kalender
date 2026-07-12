# Trade Kalender

## Import-Ledger ab v35

Bestehende `trades` und `openLots` bleiben Legacy-Daten. Ab dem ersten neuen
CSV-Import speichert die Drive-JSON zus\u00e4tzlich die unver\u00e4nderten
`importRows` und den einmaligen `importBaseOpenLots`-Snapshot. Daraus werden
neue Import-Trades und offene Lots bei jedem Replay reproduzierbar abgeleitet.

Der erste Ledger-Import darf deshalb nur neue Brokerzeilen enthalten. Einen
vollst\u00e4ndigen historischen Neuaufbau erfordert weiterhin den originalen CSV-
Export. Importierte Trades werden gel\u00f6scht und durch Replay korrigiert; f\u00fcr
inhaltliche Korrekturen wird die korrigierte CSV erneut importiert.

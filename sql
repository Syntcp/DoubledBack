-- ⚙️ Nettoyage préalable (si besoin)
DELETE FROM Project;
DELETE FROM Client;

-- 🧍‍♂️ Insertion des clients
INSERT INTO Client (id, fullName, email, phone, company, notes, isActive, createdAt, updatedAt)
VALUES
(1, 'Noa Lefèvre', 'noa.lefevre@creativpulse.fr', '+33 6 72 45 18 92', 'CreativPulse', 'Agence de communication digitale orientée UX/UI.', 1, NOW(), NOW()),
(2, 'Milan Rossi', 'milan.rossi@agilcore.io', '+33 6 38 21 74 06', 'AgilCore', 'Consultant tech, migration cloud et CI/CD.', 1, NOW(), NOW()),
(3, 'Éléa Fontaine', 'elea.fontaine@mielline.com', '+33 7 68 13 42 57', 'Mielline', 'Startup e-commerce spécialisée dans les produits apicoles français.', 1, NOW(), NOW()),
(4, 'Hector Bérard', 'hector.berard@metawood.fr', '+33 6 44 87 10 32', 'MetaWood', 'Mobilier éco-conçu et connecté (capteurs IoT).', 1, NOW(), NOW()),
(5, 'Anya Durieux', 'anya.durieux@bloomytech.com', '+33 7 70 32 55 19', 'BloomyTech', 'SaaS de gestion RH pour PME.', 1, NOW(), NOW()),
(6, 'Tao Benali', 'tao.benali@grapehub.io', '+33 6 88 99 71 54', 'GrapeHub', 'Plateforme collaborative pour viticulteurs.', 1, NOW(), NOW()),
(7, 'Louna Caradec', 'louna.caradec@artesia.design', '+33 6 81 65 92 00', 'Artesia Design', 'Studio créatif et graphisme numérique.', 1, NOW(), NOW()),
(8, 'Samuel Khedira', 'samuel.khedira@algopoint.fr', '+33 7 55 33 64 22', 'AlgoPoint', 'Solutions IA pour la logistique.', 1, NOW(), NOW()),
(9, 'Dalia Moreau', 'dalia.moreau@greenflow.fr', '+33 6 40 10 98 43', 'GreenFlow', 'Application de suivi d’énergie solaire.', 1, NOW(), NOW()),
(10, 'Nassim Leroy', 'nassim.leroy@fixway.io', '+33 6 47 22 19 84', 'Fixway', 'Maintenance préventive industrielle.', 1, NOW(), NOW()),
(11, 'Maïa Ouedraogo', 'maia.ouedraogo@softberry.com', '+33 6 64 32 18 55', 'SoftBerry', 'Développement d’applications métiers.', 1, NOW(), NOW()),
(12, 'Anton Rivière', 'anton.riviere@cogitek.fr', '+33 7 51 28 94 17', 'Cogitek', 'Consulting data & BI.', 1, NOW(), NOW()),
(13, 'Lina Martel', 'lina.martel@nectis.io', '+33 6 92 45 19 60', 'Nectis', 'Startup santé et nutrition connectée.', 1, NOW(), NOW()),
(14, 'Jonas Petit', 'jonas.petit@mechadoc.fr', '+33 7 81 43 72 09', 'MechaDoc', 'Application de diagnostic auto pour garages.', 1, NOW(), NOW()),
(15, 'Chiara Dubois', 'chiara.dubois@solairis.fr', '+33 6 89 33 74 51', 'Solairis', 'Entreprise solaire et énergies vertes.', 1, NOW(), NOW()),
(16, 'Elio Navarro', 'elio.navarro@modulus.io', '+33 6 91 88 44 03', 'Modulus', 'SaaS d’optimisation des stocks B2B.', 1, NOW(), NOW()),
(17, 'Inès Caron', 'ines.caron@trendmind.fr', '+33 7 58 66 19 91', 'TrendMind', 'Cabinet d’analyse marketing prédictive.', 1, NOW(), NOW()),
(18, 'Théo Garnier', 'theo.garnier@cobaltwave.io', '+33 6 54 76 93 01', 'CobaltWave', 'Plateforme DevOps open source.', 1, NOW(), NOW()),
(19, 'Ayla Perrot', 'ayla.perrot@luminalab.fr', '+33 6 47 63 18 84', 'LuminaLab', 'Innovation en éclairage intelligent.', 1, NOW(), NOW()),
(20, 'Rayan Costa', 'rayan.costa@flowmatic.io', '+33 6 41 28 57 30', 'Flowmatic', 'Automatisation des flux financiers.', 1, NOW(), NOW());

-- 🚀 Insertion des projets
INSERT INTO Project (clientId, name, description, repoProvider, repoUrl, repoOwner, repoName, defaultBranch, liveUrl, healthUrl, createdAt, updatedAt)
VALUES
-- CreativPulse
(1, 'PulseSite', 'Site vitrine et CMS interne.', 'GITHUB', 'https://github.com/creativpulse/pulsesite', 'creativpulse', 'pulsesite', 'main', 'https://creativpulse.fr', 'https://creativpulse.fr/health', NOW(), NOW()),
(1, 'UXFlow', 'Outil interne d’audit UX.', 'GITLAB', 'https://gitlab.com/creativpulse/uxflow', 'creativpulse', 'uxflow', 'main', 'https://uxflow.creativpulse.fr', NULL, NOW(), NOW()),

-- AgilCore
(2, 'CloudBridge', 'Migration orchestrateur Kubernetes.', 'GITHUB', 'https://github.com/agilcore/cloudbridge', 'agilcore', 'cloudbridge', 'main', 'https://cloud.agilcore.io', NULL, NOW(), NOW()),

-- Mielline
(3, 'Mellifica', 'E-commerce spécialisé miel.', 'GITHUB', 'https://github.com/mielline/mellifica', 'mielline', 'mellifica', 'main', 'https://shop.mielline.com', 'https://shop.mielline.com/health', NOW(), NOW()),

-- MetaWood
(4, 'WoodSense', 'Application IoT pour meubles connectés.', 'GITLAB', 'https://gitlab.com/metawood/woodsense', 'metawood', 'woodsense', 'main', 'https://woodsense.metawood.fr', NULL, NOW(), NOW()),

-- BloomyTech
(5, 'HRSync', 'Gestion des salariés et congés.', 'GITHUB', 'https://github.com/bloomytech/hrsync', 'bloomytech', 'hrsync', 'main', 'https://app.bloomytech.com', 'https://app.bloomytech.com/health', NOW(), NOW()),

-- GrapeHub
(6, 'VineaConnect', 'Plateforme collaborative viticole.', 'GITLAB', 'https://gitlab.com/grapehub/vineaconnect', 'grapehub', 'vineaconnect', 'develop', 'https://grapehub.io', NULL, NOW(), NOW()),

-- Artesia
(7, 'RenderOne', 'Outil de rendu 3D en ligne.', 'GITHUB', 'https://github.com/artesia/renderone', 'artesia', 'renderone', 'main', 'https://renderone.artesia.design', NULL, NOW(), NOW()),

-- AlgoPoint
(8, 'OptiRoute', 'Optimisation des livraisons par IA.', 'OTHER', NULL, NULL, NULL, 'main', 'https://optiroute.algopoint.fr', NULL, NOW(), NOW()),

-- GreenFlow
(9, 'SunTrack', 'Dashboard énergie solaire.', 'GITHUB', 'https://github.com/greenflow/suntrack', 'greenflow', 'suntrack', 'main', 'https://greenflow.fr', NULL, NOW(), NOW()),

-- Fixway
(10, 'FixOS', 'Supervision industrielle en temps réel.', 'GITLAB', 'https://gitlab.com/fixway/fixos', 'fixway', 'fixos', 'main', 'https://fixway.io', NULL, NOW(), NOW()),

-- SoftBerry
(11, 'BerrySuite', 'ERP modulaire pour PME.', 'GITHUB', 'https://github.com/softberry/berrysuite', 'softberry', 'berrysuite', 'main', 'https://berrysuite.com', 'https://berrysuite.com/health', NOW(), NOW()),

-- Cogitek
(12, 'DataPulse', 'Tableau de bord PowerBI automatisé.', 'GITHUB', 'https://github.com/cogitek/datapulse', 'cogitek', 'datapulse', 'main', 'https://cogitek.fr', NULL, NOW(), NOW()),

-- Nectis
(13, 'NutriConnect', 'Application santé & nutrition.', 'GITLAB', 'https://gitlab.com/nectis/nutriconnect', 'nectis', 'nutriconnect', 'main', 'https://nectis.io', NULL, NOW(), NOW()),

-- MechaDoc
(14, 'DiagAuto', 'Logiciel de diagnostic auto connecté.', 'GITHUB', 'https://github.com/mechadoc/diagauto', 'mechadoc', 'diagauto', 'main', 'https://mechadoc.fr', 'https://mechadoc.fr/health', NOW(), NOW()),

-- Solairis
(15, 'SolarPanel360', 'Suivi des installations solaires.', 'GITLAB', 'https://gitlab.com/solairis/solarpanel360', 'solairis', 'solarpanel360', 'main', 'https://solairis.fr', NULL, NOW(), NOW()),

-- Modulus
(16, 'Stockify', 'Optimisation prédictive des stocks.', 'GITHUB', 'https://github.com/modulus/stockify', 'modulus', 'stockify', 'main', 'https://modulus.io', NULL, NOW(), NOW()),

-- TrendMind
(17, 'PredictMind', 'Analyse marketing IA.', 'GITHUB', 'https://github.com/trendmind/predictmind', 'trendmind', 'predictmind', 'main', 'https://trendmind.fr', NULL, NOW(), NOW()),

-- CobaltWave
(18, 'WaveDeploy', 'Pipeline CI/CD open source.', 'GITLAB', 'https://gitlab.com/cobaltwave/wavedeploy', 'cobaltwave', 'wavedeploy', 'main', 'https://cobaltwave.io', NULL, NOW(), NOW()),

-- LuminaLab
(19, 'BrightSense', 'Capteurs connectés pour luminaires.', 'GITHUB', 'https://github.com/luminalab/brightsense', 'luminalab', 'brightsense', 'main', 'https://luminalab.fr', NULL, NOW(), NOW()),

-- Flowmatic
(20, 'CashSync', 'API d’automatisation comptable.', 'GITHUB', 'https://github.com/flowmatic/cashsync', 'flowmatic', 'cashsync', 'main', 'https://flowmatic.io', 'https://flowmatic.io/health', NOW(), NOW());

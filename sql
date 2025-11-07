-- ⚙️ Nettoyage préalable (si besoin)
DELETE FROM Project;
DELETE FROM Client;

-- 🧍‍♂️ Insertion des clients
INSERT INTO Client (id, fullName, email, phone, company, notes, isActive, createdAt, updatedAt)
VALUES
(1001, 'Noa Lefèvre', 'noa.lefevre@creativpulse.fr', '+33 6 72 45 18 92', 'CreativPulse', 'Agence de communication digitale orientée UX/UI.', 1, NOW(), NOW()),
(1002, 'Milan Rossi', 'milan.rossi@agilcore.io', '+33 6 38 21 74 06', 'AgilCore', 'Consultant tech, migration cloud et CI/CD.', 1, NOW(), NOW()),
(1003, 'Éléa Fontaine', 'elea.fontaine@mielline.com', '+33 7 68 13 42 57', 'Mielline', 'Startup e-commerce spécialisée dans les produits apicoles français.', 1, NOW(), NOW()),
(1004, 'Hector Bérard', 'hector.berard@metawood.fr', '+33 6 44 87 10 32', 'MetaWood', 'Mobilier éco-conçu et connecté (capteurs IoT).', 1, NOW(), NOW()),
(1005, 'Anya Durieux', 'anya.durieux@bloomytech.com', '+33 7 70 32 55 19', 'BloomyTech', 'SaaS de gestion RH pour PME.', 1, NOW(), NOW()),
(1006, 'Tao Benali', 'tao.benali@grapehub.io', '+33 6 88 99 71 54', 'GrapeHub', 'Plateforme collaborative pour viticulteurs.', 1, NOW(), NOW()),
(1007, 'Louna Caradec', 'louna.caradec@artesia.design', '+33 6 81 65 92 00', 'Artesia Design', 'Studio créatif et graphisme numérique.', 1, NOW(), NOW()),
(1008, 'Samuel Khedira', 'samuel.khedira@algopoint.fr', '+33 7 55 33 64 22', 'AlgoPoint', 'Solutions IA pour la logistique.', 1, NOW(), NOW()),
(1009, 'Dalia Moreau', 'dalia.moreau@greenflow.fr', '+33 6 40 10 98 43', 'GreenFlow', 'Application de suivi dénergie solaire.', 1, NOW(), NOW()),
(1010, 'Nassim Leroy', 'nassim.leroy@fixway.io', '+33 6 47 22 19 84', 'Fixway', 'Maintenance préventive industrielle.', 1, NOW(), NOW()),
(1011, 'Maïa Ouedraogo', 'maia.ouedraogo@softberry.com', '+33 6 64 32 18 55', 'SoftBerry', 'Développement d’applications métiers.', 1, NOW(), NOW()),
(1012, 'Anton Rivière', 'anton.riviere@cogitek.fr', '+33 7 51 28 94 17', 'Cogitek', 'Consulting data & BI.', 1, NOW(), NOW()),
(1013, 'Lina Martel', 'lina.martel@nectis.io', '+33 6 92 45 19 60', 'Nectis', 'Startup santé et nutrition connectée.', 1, NOW(), NOW()),
(1014, 'Jonas Petit', 'jonas.petit@mechadoc.fr', '+33 7 81 43 72 09', 'MechaDoc', 'Application de diagnostic auto pour garages.', 1, NOW(), NOW()),
(1015, 'Chiara Dubois', 'chiara.dubois@solairis.fr', '+33 6 89 33 74 51', 'Solairis', 'Entreprise solaire et énergies vertes.', 1, NOW(), NOW()),
(1016, 'Elio Navarro', 'elio.navarro@modulus.io', '+33 6 91 88 44 03', 'Modulus', 'SaaS d’optimisation des stocks B2B.', 1, NOW(), NOW()),
(1017, 'Inès Caron', 'ines.caron@trendmind.fr', '+33 7 58 66 19 91', 'TrendMind', 'Cabinet d’analyse marketing prédictive.', 1, NOW(), NOW()),
(1018, 'Théo Garnier', 'theo.garnier@cobaltwave.io', '+33 6 54 76 93 01', 'CobaltWave', 'Plateforme DevOps open source.', 1, NOW(), NOW()),
(1019, 'Ayla Perrot', 'ayla.perrot@luminalab.fr', '+33 6 47 63 18 84', 'LuminaLab', 'Innovation en éclairage intelligent.', 1, NOW(), NOW()),
(1020, 'Rayan Costa', 'rayan.costa@flowmatic.io', '+33 6 41 28 57 30', 'Flowmatic', 'Automatisation des flux financiers.', 1, NOW(), NOW()),
(1021, 'Léa Morel','lea.morel@fournildebelleville.fr','+33 6 52 89 14 73', 'Flowmatic', 'Boulangerie Le Fournil de Belleville',  1, NOW(), NOW()),
(1022, 'Nicolas Perrin','n.perrin@atelierjolispots.com','+33 7 81 24 67 09', 'Flowmatic', 'Atelier Les Jolis Pots', 1, NOW(), NOW()),
(1023, 'Amélie Caradec','amelie@maisonvalauris.fr','+33 6 18 44 92 30', 'Flowmatic', 'Maison Valauris Cosmétiques', 1, NOW(), NOW()),
(1024, 'Hugo Lemaître','hugo@panier-vert.fr','+33 6 33 72 11 94', 'Flowmatic', 'Épicerie Le Panier Vert', 1, NOW(), NOW()),
(1025, 'Salomé Garnier','s.garnier@pixel-plume.studio','+33 6 15 90 27 61', 'Flowmatic', 'Studio Pixel & Plume', 1, NOW(), NOW()),
(1026, 'Yanis Benhamou','yanis@cafedesdocks.fr','+33 7 69 12 45 88', 'Flowmatic', 'Café des Docks', 1, NOW(), NOW()),
(1027, 'Maëlys Roche','maelys@serres-du-val.fr','+33 6 41 77 02 53', 'Flowmatic', 'Les Serres du Val', 1, NOW(), NOW()),
(1028, 'Théo Marchand','theo@menuiserie-lemaitre.fr','+33 6 54 73 28 10', 'Flowmatic', 'Menuiserie Lemaître & Fils', 1, NOW(), NOW()),
(1029, 'Camille Navarro','c.navarro@pharmacie-gare.fr','+33 7 55 10 66 32', 'Flowmatic', 'Pharmacie de la Gare', 1, NOW(), NOW()),
(1030, 'Sébastien Aubry','seb@fromagerie-des-alpages.fr','+33 6 22 83 49 06', 'Flowmatic', 'Fromagerie des Alpages', 1, NOW(), NOW()),
(1031, 'Inès Diallo','ines@brasserie-laclef.fr','+33 6 73 61 58 47', 'Flowmatic', 'Brasserie La Clef', 1, NOW(), NOW()),
(1032, 'Antoine Caron','antoine@librairie-filigrane.fr','+33 7 79 64 13 22', 'Flowmatic', 'Librairie Le Filigrane', 1, NOW(), NOW());

-- 🚀 Insertion des projets
INSERT INTO Project (clientId, name, description, repoProvider, repoUrl, repoOwner, repoName, defaultBranch, liveUrl, healthUrl, createdAt, updatedAt)
VALUES
-- CreativPulse
(101, 'PulseSite', 'Site vitrine et CMS interne.', 'GITHUB', 'https://github.com/creativpulse/pulsesite', 'creativpulse', 'pulsesite', 'main', 'https://creativpulse.fr', 'https://creativpulse.fr/health', NOW(), NOW()),
(101, 'UXFlow', 'Outil interne d’audit UX.', 'GITLAB', 'https://gitlab.com/creativpulse/uxflow', 'creativpulse', 'uxflow', 'main', 'https://uxflow.creativpulse.fr', NULL, NOW(), NOW()),

-- AgilCore
(102, 'CloudBridge', 'Migration orchestrateur Kubernetes.', 'GITHUB', 'https://github.com/agilcore/cloudbridge', 'agilcore', 'cloudbridge', 'main', 'https://cloud.agilcore.io', NULL, NOW(), NOW()),

-- Mielline
(103, 'Mellifica', 'E-commerce spécialisé miel.', 'GITHUB', 'https://github.com/mielline/mellifica', 'mielline', 'mellifica', 'main', 'https://shop.mielline.com', 'https://shop.mielline.com/health', NOW(), NOW()),

-- MetaWood
(104, 'WoodSense', 'Application IoT pour meubles connectés.', 'GITLAB', 'https://gitlab.com/metawood/woodsense', 'metawood', 'woodsense', 'main', 'https://woodsense.metawood.fr', NULL, NOW(), NOW()),

-- BloomyTech
(105, 'HRSync', 'Gestion des salariés et congés.', 'GITHUB', 'https://github.com/bloomytech/hrsync', 'bloomytech', 'hrsync', 'main', 'https://app.bloomytech.com', 'https://app.bloomytech.com/health', NOW(), NOW()),

-- GrapeHub
(106, 'VineaConnect', 'Plateforme collaborative viticole.', 'GITLAB', 'https://gitlab.com/grapehub/vineaconnect', 'grapehub', 'vineaconnect', 'develop', 'https://grapehub.io', NULL, NOW(), NOW()),

-- Artesia
(107, 'RenderOne', 'Outil de rendu 3D en ligne.', 'GITHUB', 'https://github.com/artesia/renderone', 'artesia', 'renderone', 'main', 'https://renderone.artesia.design', NULL, NOW(), NOW()),

-- AlgoPoint
(108, 'OptiRoute', 'Optimisation des livraisons par IA.', 'OTHER', NULL, NULL, NULL, 'main', 'https://optiroute.algopoint.fr', NULL, NOW(), NOW()),

-- GreenFlow
(109, 'SunTrack', 'Dashboard énergie solaire.', 'GITHUB', 'https://github.com/greenflow/suntrack', 'greenflow', 'suntrack', 'main', 'https://greenflow.fr', NULL, NOW(), NOW()),

-- Fixway
(1010, 'FixOS', 'Supervision industrielle en temps réel.', 'GITLAB', 'https://gitlab.com/fixway/fixos', 'fixway', 'fixos', 'main', 'https://fixway.io', NULL, NOW(), NOW()),

-- SoftBerry
(1011, 'BerrySuite', 'ERP modulaire pour PME.', 'GITHUB', 'https://github.com/softberry/berrysuite', 'softberry', 'berrysuite', 'main', 'https://berrysuite.com', 'https://berrysuite.com/health', NOW(), NOW()),

-- Cogitek
(1012, 'DataPulse', 'Tableau de bord PowerBI automatisé.', 'GITHUB', 'https://github.com/cogitek/datapulse', 'cogitek', 'datapulse', 'main', 'https://cogitek.fr', NULL, NOW(), NOW()),

-- Nectis
(1013, 'NutriConnect', 'Application santé & nutrition.', 'GITLAB', 'https://gitlab.com/nectis/nutriconnect', 'nectis', 'nutriconnect', 'main', 'https://nectis.io', NULL, NOW(), NOW()),

-- MechaDoc
(1014, 'DiagAuto', 'Logiciel de diagnostic auto connecté.', 'GITHUB', 'https://github.com/mechadoc/diagauto', 'mechadoc', 'diagauto', 'main', 'https://mechadoc.fr', 'https://mechadoc.fr/health', NOW(), NOW()),

-- Solairis
(1015, 'SolarPanel360', 'Suivi des installations solaires.', 'GITLAB', 'https://gitlab.com/solairis/solarpanel360', 'solairis', 'solarpanel360', 'main', 'https://solairis.fr', NULL, NOW(), NOW()),

-- Modulus
(1016, 'Stockify', 'Optimisation prédictive des stocks.', 'GITHUB', 'https://github.com/modulus/stockify', 'modulus', 'stockify', 'main', 'https://modulus.io', NULL, NOW(), NOW()),

-- TrendMind
(1017, 'PredictMind', 'Analyse marketing IA.', 'GITHUB', 'https://github.com/trendmind/predictmind', 'trendmind', 'predictmind', 'main', 'https://trendmind.fr', NULL, NOW(), NOW()),

-- CobaltWave
(1018, 'WaveDeploy', 'Pipeline CI/CD open source.', 'GITLAB', 'https://gitlab.com/cobaltwave/wavedeploy', 'cobaltwave', 'wavedeploy', 'main', 'https://cobaltwave.io', NULL, NOW(), NOW()),

-- LuminaLab
(1019, 'BrightSense', 'Capteurs connectés pour luminaires.', 'GITHUB', 'https://github.com/luminalab/brightsense', 'luminalab', 'brightsense', 'main', 'https://luminalab.fr', NULL, NOW(), NOW()),

-- Flowmatic
(1020, 'CashSync', 'API d’automatisation comptable.', 'GITHUB', 'https://github.com/flowmatic/cashsync', 'flowmatic', 'cashsync', 'main', 'https://flowmatic.io', 'https://flowmatic.io/health', NOW(), NOW());


DELIMITER $$

DROP PROCEDURE IF EXISTS seed_invoices$$
CREATE PROCEDURE seed_invoices()
BEGIN
  DECLARE cid INT DEFAULT 1001;
  DECLARE i INT;
  DECLARE inv_id INT;
  DECLARE item_id INT;
  DECLARE pay_id INT;
  DECLARE ev_id INT;
  DECLARE seq INT;
  DECLARE issue DATE;
  DECLARE due DATE;
  DECLARE stat VARCHAR(20);
  DECLARE sent DATETIME;
  DECLARE cancelled DATE;
  DECLARE number VARCHAR(32);
  DECLARE n_items INT;
  DECLARE j INT;
  DECLARE q DECIMAL(12,2);
  DECLARE p DECIMAL(12,2);
  DECLARE line_total DECIMAL(12,2);
  DECLARE v_subtotal DECIMAL(12,2);
  DECLARE v_tax DECIMAL(12,2);
  DECLARE v_total DECIMAL(12,2);
  DECLARE v_paid DECIMAL(12,2);
  DECLARE v_balance DECIMAL(12,2);
  DECLARE r DOUBLE;
  DECLARE dsc VARCHAR(255);
  DECLARE method VARCHAR(32);
  DECLARE pay1 DECIMAL(12,2);
  DECLARE pay2 DECIMAL(12,2);
  DECLARE first_payment_date DATE;
  DECLARE last_payment_date DATE;
  DECLARE idx INT;

  SELECT COALESCE(MAX(id),3000)+1 INTO inv_id FROM Invoice;
  SELECT COALESCE(MAX(id),4000)+1 INTO item_id FROM InvoiceItem;
  SELECT COALESCE(MAX(id),5000)+1 INTO pay_id FROM Payment;
  SELECT COALESCE(MAX(id),6000)+1 INTO ev_id FROM InvoiceStatusEvent;
  SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(number,'-',-1) AS UNSIGNED)),0)+1 INTO seq FROM Invoice WHERE number LIKE 'INV-2025-%';

  WHILE cid <= 1020 DO
    SET i = 1;
    WHILE i <= 5 DO
      SET issue = DATE_ADD('2025-07-01', INTERVAL FLOOR(RAND()*120) DAY);
      SET due = DATE_ADD(issue, INTERVAL 30 DAY);
      SET r = RAND();
      IF r < 0.18 THEN SET stat = 'PAID';
      ELSEIF r < 0.36 THEN SET stat = 'SENT';
      ELSEIF r < 0.59 THEN SET stat = 'PARTIAL';
      ELSEIF r < 0.90 THEN SET stat = 'OVERDUE';
      ELSEIF r < 0.96 THEN SET stat = 'CANCELLED';
      ELSE SET stat = 'DRAFT';
      END IF;

      SET number = CONCAT('INV-2025-', LPAD(seq,4,'0'));
      IF stat IN ('SENT','PARTIAL','PAID','OVERDUE','CANCELLED') THEN
        SET sent = TIMESTAMP(issue,'10:00:00');
      ELSE
        SET sent = NULL;
      END IF;
      IF stat = 'CANCELLED' THEN
        SET cancelled = DATE_ADD(issue, INTERVAL 10 DAY);
      ELSE
        SET cancelled = NULL;
      END IF;

      INSERT INTO Invoice (id, ownerId, clientId, number, issueDate, dueDate, currency, status, sentAt, cancelledAt, notes, terms, subtotal, taxTotal, total, paidAmount, balanceDue, createdAt, updatedAt)
      VALUES (inv_id, 1, cid, number, issue, due, 'EUR', stat, sent, cancelled, NULL, NULL, 0.00, 0.00, 0.00, 0.00, 0.00, NOW(), NOW());

      SET n_items = 2 + FLOOR(RAND()*2);
      SET v_subtotal = 0.00;
      SET j = 1;
      WHILE j <= n_items DO
        SET q = ROUND(2 + RAND()*18,2);
        SET p = ROUND(60 + RAND()*90,2);
        SET line_total = ROUND(q*p,2);
        SET idx = 1 + FLOOR(RAND()*15);
        SET dsc = CASE idx
          WHEN 1 THEN 'Design UI'
          WHEN 2 THEN 'Intégration'
          WHEN 3 THEN 'Développement boutique'
          WHEN 4 THEN 'Maintenance app'
          WHEN 5 THEN 'Shooting photos'
          WHEN 6 THEN 'Catalogue en ligne'
          WHEN 7 THEN 'Charte graphique'
          WHEN 8 THEN 'Site vitrine'
          WHEN 9 THEN 'Refonte menu'
          WHEN 10 THEN 'Atelier céramique'
          WHEN 11 THEN 'Paramétrage paiement'
          WHEN 12 THEN 'SEO'
          WHEN 13 THEN 'Hébergement'
          WHEN 14 THEN 'Support'
          ELSE 'Audit'
        END;
        INSERT INTO InvoiceItem (id, invoiceId, description, quantity, unitPrice, taxRate, total, createdAt, updatedAt)
        VALUES (item_id, inv_id, dsc, q, p, 20.00, line_total, NOW(), NOW());
        SET v_subtotal = ROUND(v_subtotal + line_total,2);
        SET item_id = item_id + 1;
        SET j = j + 1;
      END WHILE;

      SET v_tax = ROUND(v_subtotal * 0.20,2);
      SET v_total = ROUND(v_subtotal + v_tax,2);

      IF stat = 'PAID' THEN
        SET v_paid = v_total;
      ELSEIF stat = 'PARTIAL' THEN
        SET v_paid = ROUND(v_total * (0.30 + RAND()*0.40),2);
        IF v_paid >= v_total THEN SET v_paid = v_total - 0.01; END IF;
      ELSEIF stat = 'OVERDUE' THEN
        IF RAND() < 0.5 THEN
          SET v_paid = 0.00;
        ELSE
          SET v_paid = ROUND(v_total * (0.10 + RAND()*0.30),2);
          IF v_paid >= v_total THEN SET v_paid = v_total - 0.01; END IF;
        END IF;
      ELSE
        SET v_paid = 0.00;
      END IF;

      SET v_balance = ROUND(v_total - v_paid,2);

      UPDATE Invoice
      SET subtotal = v_subtotal,
          taxTotal = v_tax,
          total = v_total,
          paidAmount = v_paid,
          balanceDue = v_balance,
          updatedAt = NOW()
      WHERE id = inv_id;

      IF stat IN ('PAID','PARTIAL','OVERDUE') AND v_paid > 0 THEN
        IF stat = 'PAID' AND RAND() < 0.5 THEN
          SET pay1 = ROUND(v_total * (0.40 + RAND()*0.20),2);
          SET pay2 = ROUND(v_total - pay1,2);
          SET first_payment_date = DATE_ADD(issue, INTERVAL FLOOR(RAND()*15) DAY);
          SET last_payment_date = DATE_ADD(first_payment_date, INTERVAL FLOOR(RAND()*20) DAY);
          SET method = IF(FLOOR(RAND()*2)=0,'BANK_TRANSFER','CARD');
          INSERT INTO Payment (id, invoiceId, amount, method, reference, receivedAt, notes, createdAt)
          VALUES (pay_id, inv_id, pay1, method, CONCAT('ACOMPTE-',inv_id), first_payment_date, NULL, NOW());
          SET pay_id = pay_id + 1;
          SET method = IF(FLOOR(RAND()*2)=0,'BANK_TRANSFER','CARD');
          INSERT INTO Payment (id, invoiceId, amount, method, reference, receivedAt, notes, createdAt)
          VALUES (pay_id, inv_id, pay2, method, CONCAT('SOLDE-',inv_id), last_payment_date, NULL, NOW());
          SET pay_id = pay_id + 1;
        ELSE
          SET first_payment_date = DATE_ADD(issue, INTERVAL FLOOR(RAND()*25) DAY);
          SET last_payment_date = first_payment_date;
          SET method = IF(FLOOR(RAND()*2)=0,'BANK_TRANSFER','CARD');
          INSERT INTO Payment (id, invoiceId, amount, method, reference, receivedAt, notes, createdAt)
          VALUES (pay_id, inv_id, v_paid, method, CONCAT('PAIEMENT-',inv_id), first_payment_date, NULL, NOW());
          SET pay_id = pay_id + 1;
        END IF;
      END IF;

      IF stat = 'SENT' THEN
        INSERT INTO InvoiceStatusEvent (id, invoiceId, fromStatus, toStatus, reason, createdAt)
        VALUES (ev_id, inv_id, 'DRAFT', 'SENT', NULL, DATE(sent));
        SET ev_id = ev_id + 1;
      ELSEIF stat = 'PAID' THEN
        INSERT INTO InvoiceStatusEvent (id, invoiceId, fromStatus, toStatus, reason, createdAt)
        VALUES (ev_id, inv_id, 'SENT', 'PAID', NULL, IFNULL(last_payment_date, due));
        SET ev_id = ev_id + 1;
      ELSEIF stat = 'PARTIAL' THEN
        INSERT INTO InvoiceStatusEvent (id, invoiceId, fromStatus, toStatus, reason, createdAt)
        VALUES (ev_id, inv_id, 'SENT', 'PARTIAL', 'Acompte', IFNULL(first_payment_date, issue));
        SET ev_id = ev_id + 1;
      ELSEIF stat = 'OVERDUE' THEN
        INSERT INTO InvoiceStatusEvent (id, invoiceId, fromStatus, toStatus, reason, createdAt)
        VALUES (ev_id, inv_id, 'SENT', 'OVERDUE', 'Échéance dépassée', DATE_ADD(due, INTERVAL 1 DAY));
        SET ev_id = ev_id + 1;
      ELSEIF stat = 'CANCELLED' THEN
        INSERT INTO InvoiceStatusEvent (id, invoiceId, fromStatus, toStatus, reason, createdAt)
        VALUES (ev_id, inv_id, 'SENT', 'CANCELLED', 'Annulation commande', cancelled);
        SET ev_id = ev_id + 1;
      ELSE
        INSERT INTO InvoiceStatusEvent (id, invoiceId, fromStatus, toStatus, reason, createdAt)
        VALUES (ev_id, inv_id, 'DRAFT', 'DRAFT', NULL, issue);
        SET ev_id = ev_id + 1;
      END IF;

      SET inv_id = inv_id + 1;
      SET seq = seq + 1;
      SET i = i + 1;
    END WHILE;
    SET cid = cid + 1;
  END WHILE;
END$$

DELIMITER ;

CALL seed_invoices();

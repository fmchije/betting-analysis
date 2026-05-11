CREATE TABLE `klad` (
  `idklad` int NOT NULL AUTO_INCREMENT,
  `Domacin` varchar(45) DEFAULT NULL,
  `Gost` varchar(45) DEFAULT NULL,
  `1pre` decimal(4,2) DEFAULT NULL,
  `Xpre` decimal(4,2) DEFAULT NULL,
  `2pre` decimal(4,2) DEFAULT NULL,
  `1posle` decimal(4,2) DEFAULT NULL,
  `Xposle` decimal(4,2) DEFAULT NULL,
  `2posle` decimal(4,2) DEFAULT NULL,
  `GolovaDomaci` int DEFAULT NULL,
  `GolovaGost` int DEFAULT NULL,
  `Datum` datetime DEFAULT NULL,
  `Liga` varchar(45) DEFAULT NULL,
  PRIMARY KEY (`idklad`)
) ENGINE=InnoDB AUTO_INCREMENT=15576 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

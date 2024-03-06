# Single-server instalace serverové části CDArcha - CentOS 7

Vytvořit uživatele <code>cdarcha</code>

## Instalace manažera verzí node.js

nvm - Node Version Manager

<pre>
 [cdarcha@cdarcha ~]$ curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.38.0/install.sh | bash
 [cdarcha@cdarcha ~]$ source ~/.bash_profile
 [cdarcha@cdarcha ~]$ nvm install v14.17.1
 [cdarcha@cdarcha ~]$ nvm use v14.17.1
 [cdarcha@cdarcha ~]$ nvm alias default v14.17.1
</pre>
  
## Vypnutí selinux:

<pre>
 [root@cdarcha ~]# nano /etc/selinux/config
 Přepsat <code>SELINUX=enforcing</code> na code>SELINUX=disabled</code>
 [root@cdarcha ~]# reboot
</pre>
  
## Instalace a nakonfigurace MongoDB

<pre>
 [root@cdarcha ~]# nano /etc/yum.repos.d/mongodb-org.repo
</pre>
  
Do definice repozitáře OS:

<pre>
 [mongodb-org]
 name=MongoDB Repository
 baseurl=https://repo.mongodb.org/yum/redhat/$releasever/mongodb-org/4.4/x86_64/
 gpgcheck=1
 enabled=1
 gpgkey=https://www.mongodb.org/static/pgp/server-4.4.asc
</pre>
  
Instalace:

<pre>
 [root@cdarcha ~]# dnf install mongodb-org mongodb-org-server mongodb-org-tools
</pre>
  
Dodatečná konfigurace:

<pre>
 [root@cdarcha ~]# mkdir /home/mongodb-data; chown mongod:mongod /home/mongodb-data; chmod 755 /home/mongodb-data
 [root@cdarcha ~]# nano /etc/mongod.conf
</pre>
  
Změna typu úložiště:

<pre>
storage:
  dbPath: /home/mongodb-data
  journal:
    enabled: true
  engine: 'wiredTiger'
</pre>

Restart MongoDB:

<pre>
 [root@cdarcha ~]# systemctl restart mongod
</pre>
  
## Vytvoření provozních adresářů:

Adresář pro uskladnění archivů - bude finálním úložištěm pro archivovaná média. Ideálně do adresáře pripojit dostatečně objemný prostor z externího úložiště pomocí fstab (nebude v tomto návodu popisováno). Úložiště nemusí být optimalizované pro operace zápisu, postačí RAID5, RAID6 přes NFS apod.

<pre>
 [root@cdarcha ~]# mkdir /mnt/cdarcha; chown cdarcha:cdarcha /mnt/cdarcha; chmod 755 /mnt/cdarcha
 [root@cdarcha ~]# mkdir /mnt/cdarcha/share; chown cdarcha:cdarcha /mnt/cdarcha/share; chmod 755 /mnt/cdarcha/share
</pre>
  
## Instalace scriptů cdarcha

<pre>
 [root@cdarcha ~]$ su - cdarcha
 [cdarcha@cdarcha ~]$ mkdir ~/cdarcha; mkdir ~/log; mkdir ~/run; mkdir ~/cdarcha; cd ~/cdarcha

 [cdarcha@cdarcha ~]$ cd ~/cdarcha; git clone https://github.com/moravianlibrary/CDArcha-server.git .
 [cdarcha@cdarcha ~]$ npm i
 [cdarcha@cdarcha ~]$ npm i typescript
 [cdarcha@cdarcha ~]$ npm i pm2 tsc -g
 [cdarcha@cdarcha ~]$ chmod u+x ./bin/* ./bin/droid-6.4/droid.sh
</pre>
  
## Kompilace scriptů s spuštění

<pre>
 [cdarcha@cdarcha ~]$ cd ~/cdarcha
 [cdarcha@cdarcha ~]$ ./bin/compile.sh
 [cdarcha@cdarcha ~]$ node app.js
</pre>

# Stavový diagram archivů

![Image](https://github.com/moravianlibrary/CDArcha-server/blob/0c3523b087dd6bff5b0056390f03365cf8f38184/wiki/Cdarcha_stavovy_diagram.png)https://github.com/moravianlibrary/CDArcha-server/blob/0c3523b087dd6bff5b0056390f03365cf8f38184/wiki/Cdarcha_stavovy_diagram.png)

- **Rozpracované na klientovi** - Archivy, které ještě nebyly pomocí klienta označené jako uzavřené. Toto číslo by mělo být nízké a ideálně 0. Dlouhodobě nenulová hodnota naznačuje zapomenuté archivy, doposud neoznačené jako dokončené na klientovi.
- **Ukončené na klientovi** - Archivy, které už byly označené jako ukončené na klientovi a čekají na další zpracování. Jedná se o frontu archivů pro zpracování generátorem SIP balíků. Toto číslo by mělo být ideálně 0. Pokud je dlouhodobě nenulové, naznačuje problém s generovaním SIP balíků.
- **Rozpracované na serveru** - Archivy, které jsou v této chvíli zpracovávány generátorem SIP balíků. Neměnná nenulová hodnota naznačuje problém s generátorem SIP balíků.
- **Připravené na archivaci** - SIP balík těchto archivů byl v pořádku vygenerován. Připravené na LTP archivaci (v současnosti není žádný další proces LTP archivace zaveden).
- **Archivované** - Konečný stav. V současnosti se do tohoto stavu neprochází.
- **Timeout analýzy média (DROID)** - Chybový stav. Proces analýzy pomocí nástroje DROID trval dlouhou dobu, a proto se SIP balík nepovedlo vytvořit.
- **Jiný problém s analýzou média (DROID)** - Chybový stav. Proces analýzy pomocí nástroje DROID skončil chybou, a proto se SIP balík nepovedlo vytvořit.

# Tvorba SIP balíků

Probíhá u archivů ve stavu **Ukončené na klientovi**. Stav archivu je na začátku procesu tvorby SIP balíku změněn na **Rozpracované na serveru**, který trvá po dobu generování SIP balíků daného archivu a po úspěšném ukončení se stav mění na **Připravené na archivaci**. V případě neúspěšného generování SIP balíku je stav změněn na některý z chybový stavů.

## Prováděné operace

Archivované data jsou do serverové části importovány aplikací archivačního klienta CDArcha a ukládány na souborový systém a do databáze MongoDB. Jedná se o:

- Související biobgrafický záznam (MODS v3.6)
- ISO archivy médií a jejich popisné XML
- Skeny disků médií a jejich popisné XML
- TOC bookletů a jejich popisné XML

Data jsou do SIP balíku vkládána a s výjimkou skenů obalů a bookletů se dále v průběhu tvorby SIP balíku nemění. Změna v případě skenů obalů a bookletů spočívá v transformaci z formátu TIFF na JP2.

## Úkoly prováděné generátorem SIP balíku obohacující obsahu SIP balíku

- Generování obsahu souboru data/main_mets_*
- Generování obsahu souboru data/info_* a data/md5_
- Generování user kopie skenů obálek a bookletů
- OCR analýza skenů s výstupem ve formátu TXT a ALTO
- Analýza obsahu ISO archivu (používá se API PERO-OCR pro analýzu obálek i bookletů)

Obohacovaný obsah SIP balíku je při opakovaném generování mazán a opakovaně tvořen v aktuálním běhu.

Vyvolání přegenerování SIP balíku je možné vykonat změnou stavu archivu na stav **Ukončené na klientovi**

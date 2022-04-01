(function() { 


/*  L'évènement onload est déclenché lorsque le contenu de la page
    est dans le DOM, le chargement des images, scripts, et subframes
    est terminé. */
window.addEventListener("load", function() { 
"use strict";


const docu = {
    // Les caractères délimitant une URL : 
    delimURL : new Array(" ", "\xA0", "[", "]", "@", "!", "$", "'", "(", ")", "*", "+", ",", ";", "="),
    // Les caractères délimitant un mot :
    delimMot : new Array(" ", "\xA0", "[", "]", "@", "!", "$", "'", "(", ")", "*", "+", ",", ";", "=", ".", "?", "#", "/"),

    miseEnForme : function(evt) {
        /*  Cette fonction est appelée lorsque le bloc document est affiché avec le focus, et qu'une touche
            du clavier est frappée.
            La surveillance de cet évènement est annulée lorsque le bloc du document n'est plus affiché avec le
            style display : none; ; ou bien, lorsque le bloc est affiché, sans recevoir le focus.
            Le principe est de sélectionner le fragment de texte à mettre en forme ; celui-ci est retiré du doc
            et ajouté à un nouvel élément <span class="..."></span>. La classe définit la mise en forme.
            Cette méthode me permet de générer une arborescence correcte des noeuds <span> (je n'y suis pas
            parvenu avec des méthodes plus directes comme le remplacement du contenu).
            Pour info, lorsque des noeuds <span> sont imbriqués, le style du dernier noeud s'applique au texte.
            Ces balises sont enregistrées dans le fichier au format json, qui remplace correctement les caractères
            spéciaux.
            La propriété .key renvoie le caractère ; l'inconvénient est que celui-ci dépend du type de clavier.
            A contrario, .code représente la touche physique avec un code indépendant du type de clavier ;
            néanmoins, ces codes correspondent à un clavier QWERTY. Par exemple, la touche A sur un clavier
            AZERTY renvoie .code = keyQ.
            Dès qu'un évènement clavier impacte le doc, on suppose que son contenu est modifié ; par conséquent,
            l'indice de l'idée est ajouté à l'historique. */
        if (evt.ctrlKey && evt.altKey && evt.code === "KeyG") { 
            docu.miseEnformeClass(evt, "gras", "no_gras");
        }
        else if (evt.ctrlKey && evt.altKey && evt.code === "KeyR") { 
            docu.miseEnformeClass(evt, "rouge", "no_rouge");
        }
        else if (evt.ctrlKey && evt.altKey && evt.code === "KeyH") {
            docu.creerLien(evt);
        }
    },

    miseEnformeClass : function(evt, cl, clNo) {
        /*  La fonction est décrite en supposant que le texte est mis en gras.
            cl : la classe définissant le style à appliquer au texte sélectionné
            clNo : la classe qui supprime le style précédent
            Si une partie du texte sélectionné est en gras alors le reste du texte est mis en gras.
            Si tout le texte sélectionné est en gras alors le gras est enlevé.
            Si tout le texte sélectionné n'est pas en gras alors le gras est appliqué.
            Cela revient au même comportement que le traitement de texte writer.
            Dans ce qui suit, le terme "zone" désigne la zone sélectionnée.
            D'après mes tests :
            La comparaison de texte échoue à cause de suites d'espaces de longueur différente ; elles sont
            supprimées avec : regexp re = /\s+/g, et String.replace(re, "").
            L'idée est d'inclure la zone dans un noeud principal <span class="gras">...</span>, puis
            d'inclure ce noeud dans le document ; la structure arborescente des noeuds est gérée
            automatiquement en fermant les noeuds qui débutent avant la zone, et en ouvrant des
            noeuds lorsque le parent se termine après la zone. Ainsi, la structure reste valide. 
            Pour simplifier l'écriture des noeuds, la notation est :
            G : ouverture du noeud <span class="gras">
            /G : fermeture du noeud </span>
            NG : ouverture du noeud <span class="no_gras">
            /NG : fermeture du noeud </span>
            - : sépare les tags
            Exemple : texte = mot1 mot2 mot3 mot4
            Actions                                    L'arbre devient :
            Les 4 mots sont mis en gras                Gmot1 mot2 mot3 mot4/G
            Enlever le gras sur "mot2 mot3"            Gmot1/G NGmot2 mot3/NG Gmot4/G
            Mettre en gras "t2 mo"                     Gmot1/G NGmoGt2 mo/G-NGt3/NG Gmot4/G
            J'ai essayé la méthode Range.surroundContents() pour inclure la zone dans le noeud
            principal, mais la gestion automatique des balises est différente.
            La méthode commence par extraire la zone du document (Range.extractContent()) ; celle-ci
            devient un documentFragment qui est ajouté au noeud principal ; ce dernier est finalement
            inclus dans la zone à l'emplacement de la zone. Je ne parviens pas à décrire tous les cas,
            mais cette méthode me paraît bonne pour atteindre le résultat. */
        evt.preventDefault();   // annule l'action du navigateur lorsque ce dernier traite aussi le reccourci
        evt.stopPropagation();  // l'évènement n'est pas propagé aux autres éléments html
        var rng = document.getSelection().getRangeAt(0);     // renvoie un objet range à partir de la sélection
        if (sel.isCollapsed) {  // la zone à mettre en gras est vide
            // evt.target = <p>... texte du doc ...</p> = l'evt clavier est survenu sur cet élt
            docu.selectionneMot(evt.target, docu.delimMot, rng);  // surligne le mot
        }
        if (!rng.toString().trim())  {  // la sélection est vide
            return;  // donc, il n'y a pas d'ancre à ajouter au document
        }
        var zone = rng.extractContents();  // la zone est extraite du document (zone est un documentFragment)
        var noeudPrin = document.createElement("span");  // le noeud principal (sa classe est définie plus loin)
        noeudPrin.appendChild(zone);
        rng.insertNode(noeudPrin);  // le noeud principal est inclus dans le doc
        var re = /\s+/g;  // regexp pour supprimer les suites d'espaces dans une chaîne
        var noeuds = Array.from(noeudPrin.querySelectorAll("span." + cl));  // dans le noeud prin, les descendants avec du texte gras
        if (noeuds.length > 0) {  // la zone contient du texte en gras
            var texte = "";  // le texte en gras ;        Est-ce que tout le texte est en gras, dans la zone ?
            for (var noeud of noeudPrin.childNodes) {  // si tout le texte est en gras alors les fils sont forcément en gras
                if (noeud.className === cl) {  // ce texte en en gras
                    texte += noeud.textContent;
                }
            }
            if (texte.replace(re, "") === noeudPrin.textContent.replace(re, "")) {  // tout le texte du noeud prin est en gras
                for (var noeud of noeuds) {  // donc le texte devient normal
                    noeud.className = clNo;
                }
                noeudPrin.className = clNo;
            }
            else {  // il y a du texte normal et du texte gras
                for (var noeud of Array.from(noeudPrin.querySelectorAll("span." + clNo))) {  // donc, le texte normal devient gras
                    noeud.className = cl;
                }
                noeudPrin.className = cl;
            }
        }
        else {
            var noeud = noeudPrin.parentNode;  // l'ascendant
            while (noeud) {
                if (noeud.className === cl) {  // une partie du texte du parent est en gras
                    var noeuds = Array.from(noeudPrin.querySelectorAll("span." + clNo));  // les descendants avec du texte normal
                    if (noeuds.length > 0) {  // il existe des noeuds avec du texte normal
                        for (var noeud of noeuds) {  // donc, ce texte devient gras (puisque le texte du parent est en gras)
                            noeud.className = cl;
                        }
                        noeudPrin.className = cl;
                    }
                    else {  // tout le texte est en gras, donc il devient normal
                        noeudPrin.className = clNo;
                    }
                    return;
                }
                noeud = noeud.parentNode;
            }
            // tout le texte est normal, donc il est mis en gras (il n'y a pas d'ascendant)
            for (var noeud of Array.from(noeudPrin.querySelectorAll("span." + clNo))) { 
                noeud.className = cl;
            }
            noeudPrin.className = cl;
        }
        rng.collapse(false);  // désactive la sélection et place le curseur à la fin
    },

    collerTexte : function(evt) {
        /*  Cette fonction est appelée lorsque du texte est collé avec CTRL+v dans un document.
            evt est de type ClipboardEvent. La méthode .getData() récupère le texte brut du presse-papier.
            Celui-ci doit être concaténé avec le texte existant, qui est éventuellement mis en forme. Cela
            implique que le code html représentant le texte existant est concatené avec le nouveau texte du presse-papier.
            Par conséquent, les sauts de ligne '\n' du nouveau texte sont préalablement remplacés par <br/>, afin
            d'obtenir un code html compatible avec le texte existant. De même, les suites successives de caractères
            espaces doivent être préservées ; autrement dit, plusieurs caracères espaces sont remplacés par le même
            nombre de "&nbsp;".
            Les suites ne sont pas forcément de même longueur, donc elles sont remplacées une par une.
            Le but principal est de contrôler la création des balises html dans le texte.
            Cette astuce ne permet pas de préserver les suites d'espaces :
            var span = document.createElement("span");
            span.innerText = evt.clipboardData.getData("text/plain");
            evt.target.innerHTML += span.innerHTML; */
        if (!evt.target.isContentEditable) {  // l'élt html n'est pas éditable
            return;                           // car le collé est inutile
        }
        var reNvL = /[\f\n\r]/g;  // représente un saut de page, une fin de ligne, ou un retour chariot
        var reE = /[ \t]{2,}/g;  // les suites d'au moins 2 caractères espace ou tabulation
        const selection = document.getSelection();
        if (!selection.rangeCount) return;
        var span = document.createElement("span");  // le texte html va être inclus dans cet élément générique
        var txt = evt.clipboardData.getData("text/plain");  // le texte brut du presse-papier
        var suites = txt.match(reE);  // renvoie le tableau des suites d'espaces, ou null s'il n'y a pas de correspondance
        if (suites) {
            for (var suite of suites) {                                   // remplace une suite d'espaces
                txt = txt.replace(suite, "&nbsp;".repeat(suite.length));  // par une suite de "&nbsp;" de même longueur
            }
        }
        txt = txt.replace(reNvL, "<br/>");  // remplace les sauts de ligne par <br/>
        span.innerHTML = txt;  // la chaîne txt est interprétée comme du code html afin de rendre les sauts de lignes et les suites d'espaces
        selection.deleteFromDocument();
        selection.getRangeAt(0).insertNode(span);
        selection.collapseToEnd();  // la zone collée n'est plus surlignée, et le curseur est placé à la fin
        evt.preventDefault();
    },

    creerLien : function(evt) {
        /*  Le curseur est sur une url ; ou bien, l'url est surlignée.
            La fonctionnalité est appelée avec : CTRL + ALT + h.
            Affiche une popup pour demander le texte, qui remplace l'url.
            S'il n'est pas vide alors il remplace l'url, et une ancre est ajoutée.
            Sinon alors l'url devient le texte, et une ancre est ajoutée.
            Pour info, les noeuds <span> sont autorisés à l'intérieur d'une ancre <a>.
            Si l'ancre <a ...> est ajoutée simplement alors le lien n'est pas actif. Après quelques*
            recherches sur internet, la seule solution est de rendre le texte de l'ancre non modifiable,
            avec l'attribut contenteditable dans l'ancre : <a contenteditable=true...>. */
        var rng, ancre, txt, zone;
        evt.preventDefault();   // annule l'action du navigateur lorsque ce dernier traite aussi le reccourci
        evt.stopPropagation();  // l'évènement n'est pas propagé aux autres éléments html
        txt = window.prompt("Quel est le texte remplaçant l'url ?", "");
        rng = document.getSelection().getRangeAt(0);     // renvoie un objet range à partir de la sélection
        if (rng.collapsed) {  // la sélection est vide, donc on doit trouver l'url autour du curseur
            // evt.target = <p>... texte du doc ...</p> = l'evt clavier est survenu sur cet élt
            docu.selectionneMot(evt.target, docu.delimURL, rng);  // surligne l'url
        }
        if (!rng.toString().trim())  {  // la sélection est vide
            return;  // donc, il n'y a pas d'ancre à ajouter au document
        }
        // ici, l'url est surlignée (sélectionnée)
        ancre = document.createElement("a");  // l'élt <a>
        ancre.target = "_blank";  // pour ouvrir le lien dans un autre onlget
        ancre.href = rng.toString();  // l'url cible du lien
        ancre.setAttribute("contenteditable", "false");  // ancre non éditable, sinon le lien n'est pas actif
        if (txt) {
            ancre.appendChild(document.createTextNode(" " + txt));
            rng.deleteContents();  // la zone surlignée est supprimée
        }
        else {  // le texte est vide
            ancre.appendChild(rng.extractContents());
        }
        rng.insertNode(ancre);  // le noeud prin est inclus dans le doc
        rng.collapse(false);  // la zone n'est plus surlignée, et le curseur est placé à la fin
    },

    selectionneMot : function(blocDocu, delim, rng) {
        /*  Cette fonction est appelée pour sélectionner le mot autour du curseur. */
        
        function rechDebut(noeudTxt, delim, n=1000000) {
            /*  Renvoie la position du début du mot avant le n-ème caractère du noeud texte.
                Par défaut, n est très grand afin de pouvoir prendre en compte tout le texte.
                delim[] : liste des caractères marquant le début d'un mot ou d'une url
                Exemple : mot1 mot2 mot3, le curseur est sur le n-ème caractère de mot2, donc
                la position du début est donnée par le max de .lastIndexOf(c, n), pour chaque
                caractère délimiteur c.
                .lastIndexOf(c, n) renvoie -1 lorsque le caractère n'existe pas dans la chaîne.
                Cela n'impacte pas la recherche du maximum. */
            var c, iMax = -1;
            for (c of delim) {  // c : caractère délimitant le début
                iMax = Math.max(noeudTxt.textContent.lastIndexOf(c, n), iMax);
            }
            return iMax;
        }

        function rechFin(noeudTxt, delim, n=0) {
            /*  Renvoie la position de la fin du mot à partir du n-ème caractère du noeud texte.
                Par défaut, n est nul afin de pouvoir prendre en compte tout le texte.
                delim[] : liste des caractères marquant le début d'un mot ou d'une url
                Exemple : mot1 mot2 mot3, le curseur est sur le sur le n-ème caractère de mot2, donc
                la position de la fin est donnée par le min de .indexOf(c, n), pour chaque
                caractère délimiteur c.
                Attention : indexOf(c, n) renvoie -1 si le caractère n'existe pas ; cette valeur ne
                doit donc pas entrer dans le calcul du minimum.
                Je suppose qu'il y a moins de 1000000 de caractères dans le texte du document. */
            var c, i, iMin = 1000000;
            for (c of delim) {  // c : caractère délimitant la fin
                i = noeudTxt.textContent.indexOf(c, n);
                if (i !== -1) {  // le caractère c existe
                    iMin = Math.min(iMin, i);
                }  // sinon, on ne fait rien puisqu'il n'y a pas d'impact sur iMin
            }
            if (iMin === 1000000) {  // dans la boucle, i est toujours égal à -1
                return -1;  // donc le caract c n'existe pas
            }
            return iMin;  // iMin est la fin du mot
        }
        
        function rechDebutFinMot(blocDocu, delim, noeud, fctRechDelim, propSibling) {
            /*  Renvoie la position du début ou de la fin du mot inclut dans le noeud, qui est de type texte.
                delim[] : liste des caractères délimitant un mot ou une url.
                fctRechDelim : la fonction pour obtenir la position du début ou de la fin du mot
                blocDocu : noeud <p> incluant le texte du document
                propSibling : la propriété pour remonter ou descendre le flot html du document */
            var noeudTxt = noeud, noeuds = new Array(), noeud_, i;
            for (;;) {
                if (noeud[propSibling]) {
                    noeud = noeud[propSibling];
                    noeuds.splice(0);  // vide la pile des noeuds
                    noeuds.push(noeud);
                    while (noeuds.length > 0) {
                        noeud_ = noeuds.pop();
                        if (noeud_.nodeType === 3) {  // c'est un noeud texte
                            i = fctRechDelim(noeud_, delim);
                            if (i !== -1) {
                                return [noeud_, i];
                            }
                            noeudTxt = noeud_;
                        }
                        /*  sinon, le noeud est forcément un élément ; néanmoins, il pourrait ne pas avoir d'enfant. Cela se produit
                            avec les noeuds générés dans le document (exemple : <span class="rouge"></span>) ; ces noeuds doivent être
                            ignorés car ils ne délimitent pas un mot. En revanche, d'autres éléments marquent le début ou la fin d'un
                            mot : line-break, table, image, ligne horizontale, etc ; cela implique de vérifier leur présence. */
                        else if (noeud_.nodeName === "BR" || noeud_.nodeName === "IMG" || noeud_.nodeName === "HR" || noeud_.nodeName === "TABLE"
                        || noeud_.nodeName === "EMBED" || noeud_.nodeName === "OBJECT" || noeud_.nodeName === "IFRAME")
                        {  // ces balises marquent le début ou la fin
                            if (propSibling === "previousSibling") {
                                return [noeudTxt, 0];  // donc, ce noeud marque le début
                            }
                            return [noeudTxt, noeudTxt.textContent.length];  // donc, ce noeud marque la fin
                        }
                        /*  On est obligé de parcourir en profondeur les noeuds de type éléments, pour obtenir les noeuds texte dans
                            le sens de la lecture.
                            noeuds[] : pile des noeuds
                            noeud_.childNodes : liste des enfants de gauche à droite (du haut vers le bas, avec ma représentation)
                            Array.from(noeud_.childNodes).reverse() : liste des enfants dans l'ordre inverse
                            La liste des enfants est empilée, puis le dernier noeud de la pile est repris.
                            Pour chercher le début du mot, le remontée du flot html est réalisée en empilant la liste donnée dans
                            l'ordre du haut vers le bas ; à contrario, la rech de la fin du mot implique de descendre le flot html,
                            donc la liste doit être inversée. */                            
                        if (propSibling === "previousSibling") {
                            Array.prototype.push.apply(noeuds, noeud_.childNodes);
                        }
                        else {
                            Array.prototype.push.apply(noeuds, Array.from(noeud_.childNodes).reverse());
                        }
                    }
                }
                else {  // il n'y a plus de voisin
                    noeud = noeud.parentNode;
                    if (noeud === blocDocu) {
                        if (propSibling === "previousSibling") {
                                return [noeudTxt, 0];  // donc, ce noeud marque le début
                        }
                        return [noeudTxt, noeudTxt.textContent.length];  // donc, ce noeud marque la fin
                    }
                }
            }
        }
        /*  La gestion des ' ' dans le bloc où editable=true :
            Lorsque plusieurs ' ' se succèdent, il y a des ' ' simples avec le code ascii 32, et des espaces insécables
            avec le code ascii 160 (A0 en hexa). Cela implique le début (resp. la fin) du mot est délimité par la plus
            grande (resp. petite) position du ' ' simple, ou de l'espace insécable.
            String.lastIndexOf(' ' ou 'espace insécable', n) renvoie la position du début du mot
            String.indexOf(' ' ou 'espace insécable', n) renvoie la position de la fin du mot 
            Qu'est-ce qu'un espace insécable entre 2 mots ?
            https://fr.wikipedia.org/wiki/Espace_ins%C3%A9cable
            Si la ligne pourrait contenir le 1er mot, mais pas le 2ème car elle n'est pas assez longue, alors les 2 mots
            seront automatiquement affichés ensemble sur la ligne suivante. */
        var c, noeudDebut, noeudFin, iDebut, iFin;
        if (rng.startContainer.nodeType !== 3) {  // le curseur n'est pas sur un texte
            return;  // donc, il n'y a pas de mot à sélectionner
        }
        noeudDebut = rng.startContainer;
        noeudFin = noeudDebut;
        iDebut = rechDebut(noeudDebut, delim, rng.startOffset);  // rech le début dans le noeud texte incluant le curseur
        iFin = rechFin(noeudDebut, delim, rng.startOffset);  // rech la fin dans le noeud texte incluant le curseur
        if (iDebut === -1) {  // la position de début n'existe pas
            [noeudDebut, iDebut] = rechDebutFinMot(blocDocu, delim, rng.startContainer, rechDebut, "previousSibling");
        }
        if (iFin === -1) {  // la position de fin n'existe pas
            [noeudFin, iFin] = rechDebutFinMot(blocDocu, delim, rng.startContainer, rechFin, "nextSibling");
        }
        for (c of delim) {  // si le début est un délimiteur alors il est ignoré
            if (noeudDebut.textContent.startsWith(c, iDebut)) {
                iDebut += 1;
                break;
            }
        }
        rng.setStart(noeudDebut, iDebut);
        rng.setEnd(noeudFin, iFin);
    }
};

document.addEventListener("keydown", docu.miseEnForme);  // surveille un évenement clavier
document.addEventListener("paste", docu.collerTexte);  // surveille l'évt coller (copier/coller du texte dans un doc)

})  // appelée lorsque le chargement de la page est terminé

})();

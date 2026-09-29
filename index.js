// --- IMPORTAÇÕES DAS BIBLIOTECAS ---
const express = require("express");
const fs = require("node:fs/promises"); // Módulo nativo do Node.js para manipulação de arquivos de forma assíncrona
const path = require("node:path");     // Módulo para gerenciar caminhos de diretórios e arquivos com segurança

const app = express();
const rankingFile = path.join(__dirname, "ranking.json"); // Caminho onde o arquivo de ranking será salvo

// Habilita o servidor para compreender dados enviados no formato JSON (req.body)
app.use(express.json());

// ==========================================
// 1. ROTAS DO BACK-END (GERENCIAMENTO DE RANKING)
// ==========================================

// Rota GET: Lê o arquivo de ranking e devolve os dados em formato JSON para o front-end
app.get("/ranking", async (req, res) => {
  try {
    const content = await fs.readFile(rankingFile, "utf8");
    const rankings = content.trim() ? JSON.parse(content) : [];
    res.json(Array.isArray(rankings) ? rankings : []);
  } catch (error) {
    if (error.code === "ENOENT") return res.json([]);
    console.error("Erro ao ler o ranking:", error);
    res.status(500).json({ error: "Não foi possível ler o ranking." });
  }
});

// Rota POST: Salva uma nova pontuação quando o jogador erra e envia o nome
app.post("/ranking", async (req, res) => {
  const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
  const rank = Number(req.body.rank);

  if (!name || !Number.isInteger(rank) || rank < 0) {
    return res.status(400).json({ error: "Nome ou rank inválido." });
  }

  try {
    let rankings = [];
    try {
      const content = await fs.readFile(rankingFile, "utf8");
      rankings = content.trim() ? JSON.parse(content) : [];
      if (!Array.isArray(rankings)) rankings = [];
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }

    rankings.push({ name, rank, date: new Date().toISOString() });
    await fs.writeFile(rankingFile, JSON.stringify(rankings, null, 2), "utf8");
    res.json({ success: true });
  } catch (error) {
    console.error("Erro ao salvar o ranking:", error);
    res.status(500).json({ error: "Não foi possível salvar o ranking: " + error.message });
  }
});

// ==========================================
// 2. INTERFACE DO JOGO (FRONT-END EMBUTIDO)
// ==========================================

app.get("/", (req, res) => {
  res.send(`
  <div style="padding: 2px 20px; font-family: system-ui">
    <h1 style="color: #5C6AC4;">Pokémon aleatório</h1>
    
    <p id="draw-counter" aria-live="polite">Score: 0</p>
    <div id="pokemon-types" aria-live="polite" style="margin-bottom: 15px;"></div>
    <div id="pokemon-name" aria-live="polite"></div>

    <!-- BOTÃO E RANKING FIXADOS NO CANTO INFERIOR ESQUERDO -->
    <div style="position: fixed; bottom: 20px; left: 20px; z-index: 1000;">
      <!-- Caixa de listagem do ranking (abre para cima do botão) -->
      <div id="ranking-list" style="margin-bottom: 8px; background: #f4f4f4; padding: 10px; border-radius: 6px; display: none; max-width: 300px; max-height: 250px; overflow-y: auto; box-shadow: 0px 4px 10px rgba(0,0,0,0.2);"></div>
      
      <!-- Botão fixado -->
      <button id="btn-ranking" style="padding: 10px 16px; cursor: pointer; background-color: #5C6AC4; color: white; border: none; border-radius: 6px; font-weight: bold; box-shadow: 0px 2px 5px rgba(0,0,0,0.2);">Ver Ranking</button>
    </div>
  </div>
  
  <script>
    // Dicionário de cores oficiais correspondentes a cada tipo de Pokémon
    const typeColors = {
      normal: "#A8A878", fire: "#F08030", water: "#6890F0", grass: "#78C850",
      electric: "#F8D030", ice: "#98D8D8", fighting: "#C03028", poison: "#A040A0",
      ground: "#E0C068", flying: "#A890F0", psychic: "#F85888", bug: "#A8B820",
      rock: "#B8A038", ghost: "#705898", dragon: "#7038F8", dark: "#705848",
      steel: "#B8B8D0", fairy: "#EE99AC"
    };

    const result = document.getElementById("pokemon-name");
    const typesDisplay = document.getElementById("pokemon-types");
    const drawCounter = document.getElementById("draw-counter");
    const btnRanking = document.getElementById("btn-ranking");
    const rankingList = document.getElementById("ranking-list");

    let drawCount = -1;
    let correctPokemonId = null;
    let gameOver = false;
    let rankingVisible = false;

    // LÓGICA DO BOTÃO DE RANKING: Busca os dados e alterna entre mostrar/ocultar
    btnRanking.addEventListener("click", async () => {
      rankingVisible = !rankingVisible;

      if (!rankingVisible) {
        rankingList.style.display = "none";
        btnRanking.textContent = "Ver Ranking";
        return;
      }

      rankingList.style.display = "block";
      rankingList.textContent = "Carregando ranking...";

      try {
        const response = await fetch("/ranking");
        const rankings = await response.json();

        if (rankings.length === 0) {
          rankingList.textContent = "Nenhuma pontuação registrada ainda.";
          return;
        }

        // Ordena os jogadores do maior score para o menor
        rankings.sort((a, b) => b.rank - a.rank);

        rankingList.replaceChildren();
        const h3 = document.createElement("h3");
        h3.textContent = "🏆 Melhores Pontuações";
        h3.style.margin = "0 0 8px 0";
        h3.style.fontSize = "15px";
        rankingList.appendChild(h3);

        const ul = document.createElement("ul");
        ul.style.margin = "0";
        ul.style.paddingLeft = "20px";
        ul.style.fontSize = "14px";

        rankings.forEach((item, index) => {
          const li = document.createElement("li");
          const dataFormatada = new Date(item.date).toLocaleDateString("pt-BR");
          li.textContent = \`\${index + 1}. \${item.name} — Score: \${item.rank} (\${dataFormatada})\`;
          ul.appendChild(li);
        });

        rankingList.appendChild(ul);
        btnRanking.textContent = "Ocultar Ranking";
      } catch (error) {
        rankingList.textContent = "Erro ao carregar o ranking.";
      }
    });

    // Função principal que desenha cada rodada do jogo
    async function drawPokemon() {
      gameOver = false;
      correctPokemonId = null;
      drawCount++;
      drawCounter.textContent = "Score: " + drawCount;
      result.textContent = "Buscando Pokémon...";
      typesDisplay.textContent = "";

      try {
        const ids = new Set();
        while (ids.size < 4) {
          ids.add(Math.floor(Math.random() * 1025) + 1);
        }

        const pokemonList = await Promise.all(
          [...ids].map(async (id) => {
            const response = await fetch("https://pokeapi.co/api/v2/pokemon/" + id);
            if (!response.ok) throw new Error("Não foi possível buscar os Pokémon.");
            return response.json();
          })
        );

        const typeKey = (pokemon) =>
          pokemon.types.map((entry) => entry.type.name).sort().join(",");
        const usedTypeSets = new Set();

        for (let i = 0; i < pokemonList.length; i++) {
          while (usedTypeSets.has(typeKey(pokemonList[i]))) {
            let replacementId;
            do {
              replacementId = Math.floor(Math.random() * 1025) + 1;
            } while (ids.has(replacementId));
            ids.add(replacementId);

            const response = await fetch("https://pokeapi.co/api/v2/pokemon/" + replacementId);
            if (!response.ok) throw new Error("Não foi possível buscar os Pokémon.");
            pokemonList[i] = await response.json();
          }
          usedTypeSets.add(typeKey(pokemonList[i]));
        }

        result.replaceChildren();
        const heading = document.createElement("p");
        heading.textContent = "Os 4 Pokémon sorteados:";
        result.appendChild(heading);

        const pokemonRow = document.createElement("div");
        pokemonRow.style.display = "flex";
        pokemonRow.style.justifyContent = "center";
        pokemonRow.style.gap = "12px";
        pokemonRow.style.flexWrap = "wrap";
        result.appendChild(pokemonRow);

        pokemonList.forEach((pokemon) => {
          const item = document.createElement("p");
          item.style.margin = "0";
          item.style.textAlign = "center";
          const image = document.createElement("img");
          
          image.src = pokemon.sprites.other?.["official-artwork"]?.front_default || pokemon.sprites.front_default;
          image.alt = pokemon.name;
          image.width = 120;
          image.height = 120;
          image.style.cursor = "pointer";
          image.setAttribute("role", "button");
          image.setAttribute("tabindex", "0");

          image.addEventListener("click", () => {
            if (gameOver) return;

            if (pokemon.id === correctPokemonId) {
              drawPokemon();
            } else {
              gameOver = true;
              const finalRank = drawCount;
              typesDisplay.textContent = "Você perdeu!";

              const nameForm = document.createElement("form");
              const nameLabel = document.createElement("label");
              nameLabel.textContent = "Digite seu nome: ";
              const nameInput = document.createElement("input");
              nameInput.type = "text";
              nameInput.name = "name";
              nameInput.autocomplete = "name";
              nameInput.required = true;
              const submitButton = document.createElement("button");
              submitButton.type = "submit";
              submitButton.textContent = "Confirmar nome";
              const nameMessage = document.createElement("p");

              nameLabel.appendChild(nameInput);
              nameForm.append(nameLabel, submitButton, nameMessage);
              typesDisplay.appendChild(nameForm);

              nameForm.addEventListener("submit", async (event) => {
                event.preventDefault();
                submitButton.disabled = true;
                nameMessage.textContent = "Salvando resultado...";

                try {
                  const response = await fetch("/ranking", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name: nameInput.value, rank: finalRank }),
                  });
                  if (!response.ok) {
                    const data = await response.json().catch(() => ({}));
                    throw new Error(data.error || "Não foi possível salvar o resultado.");
                  }

                  drawCount = -1;
                  drawPokemon();
                } catch (error) {
                  nameMessage.textContent = error.message;
                  submitButton.disabled = false;
                }
              });
            }
          });

          image.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              image.click();
            }
          });
          
          item.append("#" + pokemon.id + " ");
          item.appendChild(image);
          pokemonRow.appendChild(item);
        });

        const selected = pokemonList[Math.floor(Math.random() * pokemonList.length)];
        correctPokemonId = selected.id;

        typesDisplay.innerHTML = "Tipo(s) alvo: ";
        selected.types.forEach((entry) => {
          const typeName = entry.type.name;
          const badgeColor = typeColors[typeName] || "#777777";

          const typeBadge = document.createElement("span");
          typeBadge.textContent = typeName.toUpperCase();
          typeBadge.style.backgroundColor = badgeColor;
          typeBadge.style.color = "#FFFFFF";
          typeBadge.style.padding = "4px 10px";
          typeBadge.style.borderRadius = "12px";
          typeBadge.style.fontSize = "14px";
          typeBadge.style.fontWeight = "bold";
          typeBadge.style.marginRight = "6px";
          typeBadge.style.display = "inline-block";
          typeBadge.style.textShadow = "1px 1px 2px rgba(0,0,0,0.3)";

          typesDisplay.appendChild(typeBadge);
        });

      } catch (error) {
        typesDisplay.textContent = "";
        result.textContent = "Erro ao conectar à PokeAPI. Atualize a página para tentar novamente.";
      }
    }

    drawPokemon();
  </script>
  `);
});

app.listen(3000, () => {
  console.log("Server listening on port 3000");
});
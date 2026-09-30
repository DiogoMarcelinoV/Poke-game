// --- IMPORTAÇÕES DAS BIBLIOTECAS ---
const express = require("express");
const { createClient } = require("@supabase/supabase-js");

const app = express();

// CONFIGURAÇÃO DO SUPABASE (Compatível com variáveis de ambiente do Render e testes locais)
const SUPABASE_URL = "https://fdfmjliiubnumfkqworq.supabase.co"; // Cole aqui a URL exata que o Supabase te deu
const SUPABASE_KEY = "sb_publishable_tngEOFBwjUWlneNd4MG9Tw_7872Gafy";        // Cole aqui a chave anon/public
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Habilita o servidor para compreender dados enviados no formato JSON (req.body)
app.use(express.json());

// ==========================================
// 1. ROTAS DO BACK-END (COM SUPABASE)
// ==========================================

// Rota GET: Busca o ranking diretamente do Supabase
app.get("/ranking", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("rankings")
      .select("*")
      .order("rank", { ascending: false }); // Do maior score para o menor

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error("Erro ao ler o ranking:", error);
    res.status(500).json({ error: "Não foi possível ler o ranking." });
  }
});

// Rota POST: Salva uma nova pontuação no Supabase
app.post("/ranking", async (req, res) => {
  const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
  const rank = Number(req.body.rank);

  if (!name || !Number.isInteger(rank) || rank < 0) {
    return res.status(400).json({ error: "Nome ou rank inválido." });
  }

  try {
    const { error } = await supabase
      .from("rankings")
      .insert([{ name, rank }]);

    if (error) throw error;
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
  <!doctype html>
  <html lang="pt-BR">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <meta name="theme-color" content="#5C6AC4">
    <title>Pokemon Types</title>
    <style>
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-width: 320px;
        min-height: 100vh;
        padding: 24px 20px 100px;
        font-family: system-ui, sans-serif;
        color: #20233a;
        background: linear-gradient(145deg, #f5f6ff, #eef7ff);
      }
      .game-shell { width: min(100%, 1000px); margin: 0 auto; }
      h1 { margin: 8px 0 22px; color: #5C6AC4; text-align: center; font-size: clamp(2rem, 5vw, 3rem); }
      #draw-counter { width: fit-content; margin: 0 auto 22px; padding: 8px 18px; border-radius: 999px; background: #fff; font-weight: 700; box-shadow: 0 2px 10px #26315a12; }
      #pokemon-types { min-height: 56px; margin-bottom: 18px; text-align: center; }
      #pokemon-types span { padding: 12px 22px !important; margin: 5px !important; border-radius: 14px !important; font-size: clamp(1.35rem, 3vw, 1.7rem) !important; }
      #pokemon-name { text-align: center; }
      #pokemon-name > p { margin: 12px 0 22px; font-size: clamp(1.15rem, 2.5vw, 1.5rem); font-weight: 650; }
      .pokemon-row { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; width: 100%; }
      .pokemon-card { min-width: 0; margin: 0 !important; padding: 12px 8px; border: 1px solid #e3e6f2; border-radius: 18px; background: #fff; box-shadow: 0 5px 16px #26315a12; font-weight: 700; }
      .pokemon-image { display: block; width: min(100%, 180px); height: auto; aspect-ratio: 1; margin: 4px auto 0; object-fit: contain; touch-action: manipulation; }
      .pokemon-image:focus-visible, button:focus-visible, input:focus-visible { outline: 3px solid #f3b935; outline-offset: 3px; }
      #ranking-widget { position: fixed; z-index: 1000; bottom: max(20px, env(safe-area-inset-bottom)); left: max(20px, env(safe-area-inset-left)); }
      #ranking-list { display: none; width: min(340px, calc(100vw - 40px)); max-height: min(300px, 50vh); margin-bottom: 8px; padding: 14px; overflow-y: auto; border-radius: 12px; background: #fff; box-shadow: 0 4px 18px #0003; }
      #btn-ranking, #pokemon-name button { min-height: 44px; padding: 10px 16px; border: 0; border-radius: 8px; background: #5C6AC4; color: #fff; font: inherit; font-weight: 700; cursor: pointer; box-shadow: 0 2px 8px #0002; }
      #pokemon-name form { display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 10px; margin: 18px auto; }
      #pokemon-name input { min-height: 44px; max-width: 100%; padding: 8px 10px; border: 1px solid #aeb4ca; border-radius: 8px; font: inherit; }
      .loss-modal { position: fixed; z-index: 2000; inset: 0; display: grid; place-items: center; padding: 20px; background: #11172acc; }
      .loss-modal-card { width: min(100%, 420px); padding: 24px; border-radius: 18px; background: #fff; box-shadow: 0 12px 40px #0004; text-align: center; }
      .loss-modal-card h2 { margin: 0 0 8px; color: #5C6AC4; }
      .loss-modal-card p { margin: 8px 0 16px; }
      .loss-modal-card form { display: grid; gap: 12px; }
      .loss-modal-card label { display: grid; gap: 8px; text-align: left; font-weight: 600; }
      .loss-modal-card input { width: 100%; min-height: 46px; padding: 10px 12px; border: 0; border-radius: 8px; background: #f1f3fa; font: inherit; }
      .loss-modal-card button { min-height: 46px; padding: 10px 16px; border: 0; border-radius: 8px; background: #5C6AC4; color: #fff; font: inherit; font-weight: 700; cursor: pointer; }
      .loss-modal-card button:disabled { opacity: .65; cursor: wait; }
      @media (max-width: 700px) {
        body { padding: 18px 14px calc(100px + env(safe-area-inset-bottom)); }
        .pokemon-row { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
        .pokemon-card { padding: 8px 5px; border-radius: 14px; }
        .pokemon-image { width: min(100%, 150px); }
      }
      @media (max-width: 420px) {
        body { padding-right: 10px; padding-left: 10px; }
        .pokemon-row { gap: 8px; }
        #ranking-widget { right: max(10px, env(safe-area-inset-right)); left: max(10px, env(safe-area-inset-left)); text-align: center; }
        #ranking-list { width: 100%; max-height: 35vh; text-align: left; }
      }
    </style>
  </head>
  <body>
  <main class="game-shell">
    <h1>Pokemon Types</h1>
    <p id="draw-counter" aria-live="polite">Score: 0</p>
    <div id="pokemon-types" aria-live="polite"></div>
    <div id="pokemon-name" aria-live="polite"></div>
  </main>

  <div id="ranking-widget">
    <div id="ranking-list"></div>
    <button id="btn-ranking">Ver Ranking</button>
  </div>
  
  <script>
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
    typesDisplay.style.textAlign = "center";
    const btnRanking = document.getElementById("btn-ranking");
    const rankingList = document.getElementById("ranking-list");

    let drawCount = -1;
    let correctPokemonId = null;
    let gameOver = false;
    let rankingVisible = false;

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
        heading.textContent = "Qual deles pertence a esse tipo?";
        result.appendChild(heading);

        const pokemonRow = document.createElement("div");
        pokemonRow.className = "pokemon-row";
        result.appendChild(pokemonRow);

        pokemonList.forEach((pokemon) => {
          const item = document.createElement("p");
          item.className = "pokemon-card";
          item.style.margin = "0";
          item.style.textAlign = "center";
          const image = document.createElement("img");
          image.className = "pokemon-image";
          
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
              const modal = document.createElement("div");
              modal.className = "loss-modal";
              modal.setAttribute("role", "dialog");
              modal.setAttribute("aria-modal", "true");
              modal.setAttribute("aria-labelledby", "loss-modal-title");

              const modalCard = document.createElement("div");
              modalCard.className = "loss-modal-card";
              const modalTitle = document.createElement("h2");
              modalTitle.id = "loss-modal-title";
              modalTitle.textContent = "Você perdeu!";
              const scoreMessage = document.createElement("p");
              scoreMessage.textContent = "Sua pontuação: " + finalRank;

              const nameForm = document.createElement("form");
              const nameLabel = document.createElement("label");
              nameLabel.textContent = "Digite seu nome para salvar no ranking:";
              const nameInput = document.createElement("input");
              nameInput.type = "text";
              nameInput.name = "name";
              nameInput.autocomplete = "name";
              nameInput.required = true;
              const submitButton = document.createElement("button");
              submitButton.type = "submit";
              submitButton.textContent = "Salvar pontuação";
              const nameMessage = document.createElement("p");

              nameLabel.appendChild(nameInput);
              nameForm.append(nameLabel, submitButton, nameMessage);
              modalCard.append(modalTitle, scoreMessage, nameForm);
              modal.appendChild(modalCard);
              document.body.appendChild(modal);
              nameInput.focus();

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

                  modal.remove();
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

        typesDisplay.replaceChildren();
        selected.types.forEach((entry) => {
          const typeName = entry.type.name;
          const badgeColor = typeColors[typeName] || "#777777";

          const typeBadge = document.createElement("span");
          typeBadge.textContent = typeName.toUpperCase();
          typeBadge.style.backgroundColor = badgeColor;
          typeBadge.style.color = "#FFFFFF";
          typeBadge.style.padding = "8px 16px";
          typeBadge.style.borderRadius = "12px";
          typeBadge.style.fontSize = "20px";
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
  </body>
  </html>
  `);
});

app.listen(3000, () => {
  console.log("Server listening on port 3000");
});

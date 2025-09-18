document.addEventListener("DOMContentLoaded", () => {
  const API_BASE_URL =
    "https://backend-javascript-sahabat-gula-166777420148.asia-southeast1.run.app";
  const ACCESS_TOKEN =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImIyMDU0MmM5LTQzODYtNDYzNi1iOTA2LTg2M2YzNmNiYzdkZCIsImVtYWlsIjoiZml0cmlAc2FoYWJhdGd1bGEuY29tIiwicm9sZSI6ImFkbWluIiwidXNlcm5hbWUiOiJmaXRyaSIsImlhdCI6MTc1ODE2NDA1MCwiZXhwIjoxNzU4NzY4ODUwfQ.eqAJimZiUfUdjO3_ACnPDasMX7dqOUTPug9SqxPQ2qc";

  const listView = document.getElementById("listView");
  const formView = document.getElementById("formView");
  const detailView = document.getElementById("detailView");
  const articleListContainer = document.getElementById("articleListContainer");
  const articleDetailContainer = document.getElementById(
    "articleDetailContainer"
  );
  const articleForm = document.getElementById("articleForm");
  const addArticleBtn = document.getElementById("addArticleBtn");
  const backToListBtnForm = document.getElementById("backToListBtnForm");
  const backToListBtnDetail = document.getElementById("backToListBtnDetail");
  const submitBtn = document.getElementById("submitBtn");
  const categorySelect = document.getElementById("category_id");
  const coverInput = document.getElementById("cover_file");
  const imagePreviewWrapper = document.getElementById("imagePreviewWrapper");
  const imagePreview = document.getElementById("imagePreview");
  const removeImageBtn = document.getElementById("removeImageBtn");

  const quill = new Quill("#editor", {
    theme: "snow",
    modules: {
      toolbar: [
        [{ header: [1, 2, 3, false] }],
        ["bold", "italic", "underline", "strike"],
        [{ list: "ordered" }, { list: "bullet" }],
        ["link", "image", "blockquote"],
        ["clean"],
      ],
    },
  });

  const showView = (viewToShow) => {
    [listView, formView, detailView].forEach(
      (view) => (view.style.display = "none")
    );
    viewToShow.style.display = "block";
  };

  const navigateTo = (path) => {
    const newPath = window.location.pathname + path;
    history.pushState({}, "", newPath);
    handleRouteChange();
  };

  const handleRouteChange = () => {
    const params = new URLSearchParams(window.location.search);
    const articleId = params.get("id");
    const action = params.get("action");

    if (articleId) {
      showView(detailView);
      fetchArticleById(articleId);
    } else if (action === "tambah") {
      showView(formView);
      resetForm();
      fetchArticleCategories();
    } else {
      showView(listView);
      fetchArticles();
    }
  };

  // --- FUNGSI API ---
  const fetchArticles = async () => {
    articleListContainer.innerHTML =
      '<div class="spinner-wrapper"><div class="spinner"></div></div>';
    try {
      const response = await fetch(`${API_BASE_URL}/articles`);
      if (!response.ok) throw new Error("Gagal memuat artikel.");
      const result = await response.json();
      renderArticleList(result.data);
    } catch (error) {
      console.error("Fetch Articles Error:", error);
      articleListContainer.innerHTML = `<p>Gagal memuat artikel. Error: ${error.message}</p>`;
    }
  };

  const fetchArticleById = async (id) => {
    articleDetailContainer.innerHTML =
      '<div class="spinner-wrapper"><div class="spinner"></div></div>';
    try {
      const response = await fetch(`${API_BASE_URL}/articles/${id}`);
      if (!response.ok) {
        throw new Error(
          `Server merespons dengan status ${response.status}. Artikel kemungkinan tidak ada.`
        );
      }
      const result = await response.json();

      const articleData = result.data ? result.data.article : null;

      if (articleData && articleData.id) {
        renderArticleDetail(articleData);
      } else {
        throw new Error("Artikel tidak ditemukan dalam respons API.");
      }
    } catch (error) {
      articleDetailContainer.innerHTML = `<p style="text-align:center; color: var(--danger-color);">Gagal memuat detail artikel. <br><strong>Pesan Error:</strong> ${error.message}</p>`;
    }
  };

  const fetchArticleCategories = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/article-categories`);
      const result = await response.json();
      categorySelect.innerHTML = '<option value="">Pilih Kategori...</option>';
      result.data.forEach((cat) =>
        categorySelect.add(new Option(cat.name, cat.id))
      );
    } catch (error) {
      console.error("Gagal memuat kategori artikel:", error);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setLoadingState(true);
    const formData = new FormData();
    formData.append("title", document.getElementById("title").value);
    const content = JSON.stringify(quill.getContents());
    formData.append("content", content);
    const categoryId = document.getElementById("category_id").value;
    const categoryName = document.getElementById("category_name").value;
    if (categoryName) {
      formData.append("category_name", categoryName);
    } else if (categoryId) {
      formData.append("category_id", categoryId);
    }
    if (coverInput.files.length > 0) {
      formData.append("cover_file", coverInput.files[0]);
    }
    try {
      const response = await fetch(`${API_BASE_URL}/articles`, {
        method: "POST",
        headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
        body: formData,
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.message || "Gagal menyimpan artikel.");
      Swal.fire({
        icon: "success",
        title: "Berhasil!",
        text: "Artikel berhasil disimpan.",
      });
      navigateTo(window.location.pathname.split("?")[0]);
    } catch (error) {
      Swal.fire({ icon: "error", title: "Gagal", text: error.message });
    } finally {
      setLoadingState(false);
    }
  };

  const extractTextFromQuillContent = (contentString) => {
    try {
      const delta = JSON.parse(contentString);
      if (!delta || !delta.ops) return "";
      return delta.ops
        .map((op) => (typeof op.insert === "string" ? op.insert : " "))
        .join("")
        .replace(/\s+/g, " ")
        .trim();
    } catch (e) {
      return contentString || "";
    }
  };

  const renderArticleList = (articles) => {
    articleListContainer.innerHTML = "";
    if (!articles || articles.length === 0) {
      articleListContainer.innerHTML =
        '<p style="text-align: center; padding: 1rem;">Belum ada artikel.</p>';
      return;
    }
    articles.forEach((article) => {
      const card = document.createElement("a");
      card.className = "article-card";
      card.href = `?id=${article.id}`;
      card.onclick = (e) => {
        e.preventDefault();
        navigateTo(`?id=${article.id}`);
      };
      const contentSnippet = extractTextFromQuillContent(article.content);
      card.innerHTML = `
            <img src="${
              article.cover_url || "https://placehold.co/150x100?text=No+Image"
            }" alt="${article.title}" class="article-card-cover">
            <div class="article-card-content">
                <h3>${article.title}</h3>
                <p class="article-card-author">Sahabat Gula</p>
                <p class="article-card-snippet">${
                  contentSnippet || "<i>Tidak ada konten.</i>"
                }</p>
                <p class="article-card-category">${
                  article.article_categories?.name || "Tidak ada"
                }</p>
            </div>
        `;
      articleListContainer.appendChild(card);
    });
  };

  const renderArticleDetail = (article) => {
    articleDetailContainer.innerHTML = `
        <img src="${
          article.cover_url || "https://placehold.co/600x400?text=No+Cover"
        }" alt="${article.title}" class="detail-cover">
        <h1 class="detail-title">${article.title}</h1>
        <p class="detail-meta">Sahabat Gula | ${
          article.article_categories?.name || "Tidak ada"
        }</p>
        <div id="detailContent" class="detail-content"></div>
    `;
    const detailContentQuill = new Quill("#detailContent", {
      theme: "snow",
      modules: { toolbar: false },
      readOnly: true,
    });
    try {
      detailContentQuill.setContents(JSON.parse(article.content));
    } catch (e) {
      document.getElementById(
        "detailContent"
      ).innerHTML = `<div class="ql-editor">${article.content}</div>`;
    }
  };

  const resetForm = () => {
    articleForm.reset();
    quill.setContents([]);
    resetImageSelection();
  };
  const handleImagePreview = (file) => {
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        imagePreview.src = e.target.result;
      };
      reader.readAsDataURL(file);
      imagePreviewWrapper.style.display = "block";
    }
  };
  const resetImageSelection = () => {
    coverInput.value = "";
    imagePreviewWrapper.style.display = "none";
  };
  const setLoadingState = (isLoading) => {
    submitBtn.disabled = isLoading;
    submitBtn.classList.toggle("loading", isLoading);
    submitBtn.querySelector(".btn-text").textContent = isLoading
      ? "Menyimpan..."
      : "Simpan Artikel";
  };

  addArticleBtn.addEventListener("click", () => navigateTo("?action=tambah"));
  backToListBtnForm.addEventListener("click", () => navigateTo(""));
  backToListBtnDetail.addEventListener("click", () => navigateTo(""));
  articleForm.addEventListener("submit", handleFormSubmit);
  coverInput.addEventListener("change", () =>
    handleImagePreview(coverInput.files[0])
  );
  removeImageBtn.addEventListener("click", resetImageSelection);
  ["dragover", "dragleave", "drop"].forEach((eventName) =>
    fileDropArea.addEventListener(eventName, (e) => e.preventDefault())
  );
  fileDropArea.addEventListener("dragover", () =>
    fileDropArea.classList.add("dragover")
  );
  fileDropArea.addEventListener("dragleave", () =>
    fileDropArea.classList.remove("dragover")
  );
  fileDropArea.addEventListener("drop", (e) => {
    fileDropArea.classList.remove("dragover");
    if (e.dataTransfer.files.length) {
      coverInput.files = e.dataTransfer.files;
      handleImagePreview(coverInput.files[0]);
    }
  });
  fileDropArea.addEventListener("click", () => coverInput.click());

  window.addEventListener("popstate", handleRouteChange);
  handleRouteChange();
});

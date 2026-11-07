// Kept as plain JavaScript because this runs on the merchant's website.
// DOM properties avoid interpolating merchant URLs into HTML attributes.
export const welcomeBubblePromoScript = String.raw`
  function renderWelcomePromo(host, config, baseUrl, openChat) {
    if (!host || !config.promoImageEnabled || !config.promoImageUrl) return;
    var mediaUrl;
    try {
      mediaUrl = new URL(config.promoImageUrl, baseUrl);
      if (mediaUrl.protocol !== 'https:' && mediaUrl.protocol !== 'http:') return;
    } catch (_) { return; }
    var targetUrl = null;
    if (typeof config.promoClickUrl === 'string' && config.promoClickUrl.length <= 2048 && !/[\u0000-\u001f\u007f]/.test(config.promoClickUrl)) {
      try {
        var target = new URL(config.promoClickUrl.trim());
        if ((target.protocol === 'https:' || target.protocol === 'http:') && !target.username && !target.password) targetUrl = target.href;
      } catch (_) {}
    }
    var action = config.promoClickAction;
    var wrapper = document.createElement(action === 'chat' ? 'button' : action === 'url' && targetUrl ? 'a' : 'div');
    wrapper.style.cssText = 'display:block;width:100%;padding:0;margin:0;border:0;background:transparent;color:inherit;text-decoration:none;';
    if (wrapper.tagName === 'BUTTON') {
      wrapper.type = 'button';
      wrapper.setAttribute('aria-label', 'Open chat');
      wrapper.onclick = function(event) { event.stopPropagation(); openChat(); };
    } else if (wrapper.tagName === 'A') {
      wrapper.href = targetUrl;
      wrapper.target = '_blank';
      wrapper.rel = 'noopener noreferrer';
      wrapper.setAttribute('aria-label', 'Open promotion (new tab)');
      wrapper.onclick = function(event) { event.stopPropagation(); };
    }
    if (wrapper.tagName !== 'DIV') wrapper.style.cursor = 'pointer';
    var isVideo = /\.mp4$/i.test(mediaUrl.pathname);
    var media = document.createElement(isVideo ? 'video' : 'img');
    media.src = mediaUrl.href;
    media.style.cssText = 'width:100%;height:auto;display:block;';
    media.onerror = function() { host.style.display = 'none'; };
    if (!isVideo) media.alt = 'Promotion';
    wrapper.appendChild(media);
    host.style.position = 'relative';
    host.appendChild(wrapper);
    if (isVideo) {
      media.autoplay = true;
      media.loop = true;
      media.muted = true;
      media.defaultMuted = true;
      media.playsInline = true;
      media.setAttribute('muted', '');
      media.setAttribute('playsinline', '');
      media.preload = 'metadata';
      media.setAttribute('aria-label', 'Promotional video');
      // Separate from the link/button: Safari's play fallback never navigates away.
      var playButton = document.createElement('button');
      playButton.type = 'button';
      playButton.textContent = 'Play video';
      playButton.style.cssText = 'display:none;position:absolute;bottom:8px;left:50%;transform:translateX(-50%);border:0;border-radius:9999px;padding:8px 14px;background:#111;color:#fff;cursor:pointer;';
      host.appendChild(playButton);
      function playVideo() {
        var playback = media.play();
        if (playback && playback.catch) playback.catch(function() { playButton.style.display = 'block'; });
      }
      media.onplaying = function() { playButton.style.display = 'none'; };
      playButton.onclick = function(event) { event.preventDefault(); event.stopPropagation(); playVideo(); };
      playVideo();
    }
  }
`;

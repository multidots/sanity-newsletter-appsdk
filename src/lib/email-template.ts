import { toHTML } from "@portabletext/to-html";
import { urlFor } from '../lib/image';
import { sanityClient } from "../lib/sanity-client";


interface EmailTemplateProps {
  result: any;
  baseUrl?: string;
}

/**
 * Safely cleans any input text by ensuring it's a string
 * and removing invisible Unicode characters.
 */
async function cleanText(text: any): Promise<string> {
  return text.replace(/[\u200B-\u200F\uFEFF]/g, "").trim();
}

async function getLatestPosts(postId: string): Promise<any[]> {
  const latestPosts = await sanityClient.fetch(`
    *[_type == "post" && _id != $postId ]
    | order(_createdAt desc)[0..2]{
      title,
      excerpt,
      "slug": slug.current,
      "imageUrl": coalesce(image.asset->url, featuredImage.asset->url)
    }
  `, { postId });
  return latestPosts;
}


export async function generateEmailTemplate({ result, baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://sanity-newsletter.vercel.app' }: EmailTemplateProps): Promise<string> {
  const {post, siteSettings} = result;
  const createdAt = new Date(post._createdAt);
  const formattedDate = createdAt.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const emailSettings = await sanityClient.fetch(`
    *[_type == "emailSettings"][0]
  `);

  const showPostTitle = emailSettings?.titleSection.postTitle ?? true;
  const showPostExcerpt = emailSettings?.titleSection.postExcerpt ?? true;
  const showFeatureImage = emailSettings?.titleSection.featureImage ?? true;
  const showPublicationIcon = emailSettings?.header.publicationIcon ?? true;
  const showPublicationTitle = emailSettings?.header.publicationTitle ?? true;
  const showLatestPostsSection = emailSettings?.footer.shareLatestPosts ?? true;
  const showAskReadersForFeedback = emailSettings?.footer.askReadersForFeedback ?? true;
  const showAddLinkToComments = emailSettings?.footer.addLinkToComments ?? true;
  const showSubscriptionDetails = emailSettings?.footer.showSubscriptionDetails ?? true;

  const footerText = emailSettings?.emailFooter.text ?? '';

  const plainText = post.pageBuilder
    ?.map((block: any) => block.children?.map((child: any) => child.text).join(" "))
    .join(" ") || "";

  const words = (await cleanText(plainText)).split(/\s+/).length;
  const minutesToRead = Math.max(1, Math.ceil(words / 200));
  const tags = post.tag?.filter((tag: any) => !!tag?.title) || [];

  const generatePortableTextContent = (pageBuilder: any[]): string => {
    if (!pageBuilder || pageBuilder.length === 0) return '';

    const bodyHtml = toHTML(pageBuilder, {
      components: {
        types: {
          heroBlock: ({ value }: any) => `
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:48px 0;text-align:center;">
              <tr>
                <td align="center">
                  <table role="presentation" width="520" cellspacing="0" cellpadding="0" style="margin:0 auto;">
                    ${value?.icon?.asset ? `
                      <tr><td align="center" style="padding-bottom:32px;">
                        <img src="${urlFor(value.icon).width(120).url()}" alt="Hero Icon" width="120" style="display:block;">
                      </td></tr>` : ''}
                    ${value?.title ? `
                      <tr><td align="center" style="font-size:17px;line-height:27px;font-weight:400;color:#1a1a1a;padding:0 20px 20px 20px;">
                        ${value.title}
                      </td></tr>` : ''}
                    ${value?.description ? `
                      <tr><td align="center" style="font-size:16px;line-height:24px;color:#333;padding:0 20px;">
                        ${value.description}
                      </td></tr>` : ''}
                  </table>
                </td>
              </tr>
            </table>
          `,

          featuredBlock: ({ value }: any) => {
            const featuredPosts = value?.posts || [];
            return `
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:60px 0;">
                <tr><td style="border-bottom:1px solid #e6e6e6;font-size:15px;line-height:17px;font-weight:700;letter-spacing:0.15px;padding-bottom:11px;text-transform:uppercase;color:#1a1a1a;">
                  ${value?.title || 'Featured Posts'}
                </td></tr>
                <tr><td style="padding-top:30px;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                    ${featuredPosts.map((fp: any) => `
                      <tr>
                        <td align="center" style="padding-bottom:30px;">
                          ${fp.imageUrl ? `
                            <img src="${urlFor(fp.imageUrl).width(300).height(150).url()}" alt="${fp.title}" width="300" height="150" style="display:block;margin:0 auto 16px;border-radius:6px;">` : ''}
                          <div style="font-size:18px;font-weight:700;letter-spacing:-0.18px;line-height:24px;color:#1a1a1a;">${fp.title}</div>
                        </td>
                      </tr>
                    `).join('')}
                  </table>
                </td></tr>
              </table>
            `;
          },

          singleImageObject: ({ value }: any) => `
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 1.6em;text-align:center;">
              <tr><td align="center">
                ${value?.image?.asset ? `
                  <img src="${urlFor(value.image).url()}" alt="${value.image?.altText || ''}" style="border:none;max-width:100%;display:block;margin:0 auto;height:auto;width:auto;">` : ''}
                ${value?.caption ? `
                  <p style="font-size:14px;color:#666;margin-top:8px;font-style:italic;">${value.caption}</p>` : ''}
              </td></tr>
            </table>
          `,

          dividerBlock: () => `<hr style="border:none;border-top:1px solid #e0e7eb;margin-top: 51px;margin-bottom: 51px;">`,

          calloutBlock: ({ value }: any) => {
            const { text = "", enableEmoji = false, backgroundColor, textColor } = value;
            const bg = backgroundColor?.value || "#fcf4e3";
            const color = textColor?.value || "#15212a";

            return `
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 1.6em 0;">
                <tr>
                  <td style="background-color:${bg};color:${color};padding:24px;border-radius:8px;font-size:16px;line-height:1.5;">
                    <table role="presentation" cellspacing="0" cellpadding="0">
                      <tr>
                        ${enableEmoji ? `<td style="padding-right: 12px;font-size: 20px;">🔒</td>` : ""}
                        <td style="color: #15212a;font-size: 17px;line-height: 1.5em;">${text}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            `;
          },

          videoObject: ({ value }: any) => {
            const videoUrl = value?.videoUrl || "";
            if (!videoUrl) return "";
            let thumbnail = "";
            const isYouTube = /(?:youtube\.com|youtu\.be)/.test(videoUrl);
            const isVimeo = /vimeo\.com/.test(videoUrl);

            if (isYouTube) {
              const match = videoUrl.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
              const videoId = match ? match[1] : "";
              thumbnail = videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : "";
            } else if (isVimeo) {
              thumbnail = "https://via.placeholder.com/600x338?text=Video+Preview";
            }

            if (!thumbnail) {
              thumbnail = "https://via.placeholder.com/600x338?text=Watch+Video";
            }

            // Email-safe clickable image with play icon overlay
            return `
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:40px 0;text-align:center;">
                <tr>
                  <td align="center">
                    <a href="${videoUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;position:relative;text-decoration:none;">
                      <div style="position:relative;width: 600px;">
                        <table cellpadding="0" cellspacing="0" border="0" width="100%" background="https://i.ytimg.com/vi/ZF_sxLdfTbY/hqdefault.jpg" role="presentation" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: 100%; background-size: cover; min-height: 200px; overflow: hidden; background: url('https://i.ytimg.com/vi/ZF_sxLdfTbY/hqdefault.jpg') left top / cover; mso-hide: all;">
                            <tbody><tr style="mso-hide: all">
                                <td width="25%" style="font-family: -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif; font-size: 18px; vertical-align: top; color: #15212A; visibility: hidden; mso-hide: all;" valign="top">
                                    <img src="https://img.spacergif.org/v1/150x450/0a/spacer.png" alt="" width="100%" border="0" style="border: none; -ms-interpolation-mode: bicubic; max-width: 100%; display: block; height: auto; opacity: 0; visibility: hidden; mso-hide: all;" height="auto">
                                </td>
                                <td width="50%" align="center" valign="middle" style="font-family: -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif; font-size: 18px; color: #15212A; vertical-align: middle; mso-hide: all;">
                                    <div class="kg-video-play-button" style="height: 2em; width: 3em; margin: 0 auto; border-radius: 10px; padding: 1em 0.8em 0.6em 1em; font-size: 1em; background-color: rgba(0,0,0,0.85); mso-hide: all;"><div style="display: block; width: 0; height: 0; margin: 0 auto; line-height: 0px; border-color: transparent transparent transparent white; border-style: solid; border-width: 0.8em 0 0.8em 1.5em; mso-hide: all;"></div></div>
                                </td>
                                <td width="25%" style="font-family: -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif; font-size: 18px; vertical-align: top; color: #15212A; mso-hide: all;" valign="top">&nbsp;</td>
                            </tr>
                        </tbody></table>
                      </div>
                    </a>
                  </td>
                </tr>
              </table>
            `;
          },

          bookmarkBlock: ({value}: any) => {
            const { linkType, internalLink, internalLinkData, externalLink, hideExcerpt = false } = value;
          
            const isExternal = linkType === "external";
            let href = "#";
            let title = "Bookmark";
            let description = "";
            let imageSrc = "";
            let alt = "Bookmark";
            let authorName = "";
            let siteTitle = siteSettings?.siteTitle || "";
            let siteIcon = siteSettings?.siteLogoUrl || "";
          
            if (isExternal && externalLink) {
              try {
                const domain = new URL(externalLink);
                href = externalLink;
                title = domain.hostname.replace("www.", "");
                siteTitle = domain.hostname;
                siteIcon = `https://www.google.com/s2/favicons?sz=64&domain=${domain.hostname}`;
              } catch (e) {
                href = externalLink;
                title = externalLink;
              }
            }
          
            if (linkType === "internal") {
              if (internalLinkData) {
                href = internalLinkData.slug ? `/${internalLinkData.slug}` : "#";
                title = internalLinkData.title ?? "Untitled";
                description =
                  internalLinkData.excerpt ||
                  internalLinkData.textSnippet?.split(" ").slice(0, 20).join(" ") + "..." ||
                  "";

                description = description === 'undefined...' ? '' : description;
            
                imageSrc = internalLinkData.imageUrl || internalLinkData.featuredImage?.url || null;
                alt = internalLinkData.featuredImage?.altText || internalLinkData.image?.altText || "Bookmark image";
            
                authorName = internalLinkData.author?.[0]?.name ?? "";
              } else if (internalLink?._ref) {
                // Fallback: if internalLinkData is not available but we have a reference
                title = "Internal Link";
                href = "#";
              }
            }

            const contentWidth = imageSrc ? "67%" : "100%";
            

            return `
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 1.6em 0;border: 1px solid #e6e6e6;border-radius: 8px;overflow: hidden;">
                <tr>
                  <td style="padding:0;">
                    <a href="${href}" target="${isExternal ? "_blank" : "_self"}" rel="${isExternal ? "noopener noreferrer" : ""}" style="text-decoration:none;color:inherit;display:flex;flex-direction:row;align-items:stretch;">

                      <!-- Content -->
                      <div style="width: inherit;padding: 20px;overflow: hidden; width: ${contentWidth};">
                        <div style="color: #1a1a1a;margin-bottom: 4px;font-size: .9em;font-weight: 600;line-height: 1.4em;">${title}</div>
                        ${
                          !hideExcerpt && description
                            ? `<div style="color: #555;margin-bottom: 8px;opacity: .7;-webkit-line-clamp: 2;-webkit-box-orient: vertical;max-height: none;margin-top: .4em;font-size: .8em;font-weight: 400;line-height: 1.5em;overflow-y: hidden;">${description}</div>`
                            : ""
                        }

                        <div style="color: #777;white-space: nowrap;align-items: center;width: 100%;margin-top: 22px;font-size: .8em;font-weight: 500;display: inline-block;">
                          ${
                            siteIcon
                              ? `<img src="${siteIcon}" alt="${siteTitle}" width="20" height="20" style="display: inline-block;vertical-align: middle;border-radius: 2px;width: 20px;height: 20px;margin-right: 6px;">`
                              : ""
                          }
                          ${siteTitle ? `<span style="opacity: .7;display: inline;">${siteTitle}</span>` : ""}
                          ${authorName ? `<span style="opacity: .7;display: inline;margin:0 0 0 7px"> • ${authorName}</span>` : ""}
                        </div>
                      </div>
                       ${
                        imageSrc
                          ? `<div style="box-sizing: border-box;width: 33%;position: relative;">
                              <img src="${imageSrc}" alt="${alt}" width="180" height="120" style="display: block;object-fit: cover;position: absolute;height: 100%;width: 100%;inset: 0px;color: transparent;border-radius: 0 4px 4px 0;">
                            </div>`
                          : ""
                      }

                    </a>
                  </td>
                </tr>
              </table>
            `;

          }
        },

        block: {
          h1: ({ children }: any) => `<h1 style="font-size:22px;margin:20px 0;">${Array.isArray(children) ? children.join("") : children}</h1>`,
          h2: ({ children }: any) => `<h2 style="font-family:-apple-system,BlinkMacSystemFont,Roboto,Helvetica,Arial,sans-serif;line-height:1.11em;font-weight:700;margin:1.5em 0 0.5em 0;font-size:32px;margin-top:0;color:#15212a;">${Array.isArray(children) ? children.join("") : children}</h2>`,
          h3: ({ children }: any) => `<h3 style="font-family:-apple-system,BlinkMacSystemFont,Roboto,Helvetica,Arial,sans-serif;line-height:1.11em;font-weight:700;margin:1.5em 0 0.5em 0;font-size:26px;color:#15212a;">${Array.isArray(children) ? children.join("") : children}</h3>`,
          blockquote: ({ children }: any) => `<blockquote style="border-left:#ffbd59 2px solid;font-weight:500;letter-spacing:-0.2px;color:#15212a;padding:5px 1.5em;margin:0 0 2em 0px;font-size:17px;line-height:1.6em;">${Array.isArray(children) ? children.join("") : children}</blockquote>`,
          normal: ({ children }: any) => `<p style="margin: 0 0 1.5em 0;line-height: 1.6em;color: #15212a;font-size: 17px;font-family: 'Noto Sans', Arial, sans-serif;">${Array.isArray(children) ? children.join("") : children}</p>`,
        },

        marks: {
          link: ({ children, value }: any) =>
            `<a href="${value.href}" style="color:#ffbd59;text-decoration:underline;">${Array.isArray(children) ? children.join("") : children}</a>`,
        },
      },
    });

    return bodyHtml;
  };

  const portableTextContent = generatePortableTextContent(post.pageBuilder || []);
  const authors = post.author || [];

  const latestPosts = await getLatestPosts(post._id);

  const latestPostsSection =
  latestPosts && Array.isArray(latestPosts) && latestPosts.length > 0
    ? `
      <tr>
        <td style="font-size: 18px;vertical-align: top;color: #15212a;padding: 24px 0;border-top: 1px solid #e0e7eb;">
          <h3 style="line-height: 1.11em;margin: 0;padding: 8px 0 8px;color: #15212a;font-size: 13px;font-weight: 600;text-transform: uppercase;padding-bottom: 16px;">Keep reading</h3>
      ${latestPosts
        .map(
          (p: any) => `
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" 
                style="margin: 0 0 1.6em 0;border: 1px solid #e6e6e6;border-radius: 8px;overflow: hidden;">
                <tr>
                  <td style="padding:0;">
                    <a href="${baseUrl}/${p.slug}" target="_blank" 
                      style="text-decoration:none;color:inherit;display:block;">
                      
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;max-height: 140px;">
                        <tr>
                          <!-- Text -->
                          <td valign="top" style="padding:15px;width:70%;">
                            <div style="color:#1a1a1a;margin-bottom:4px;font-size:17px;font-weight:600;line-height:1.4em;">
                              ${p.title}
                            </div>
                           ${
                              p.excerpt
                                ? (() => {
                                    // Clean and normalize the excerpt
                                const cleanExcerpt = p.excerpt
                                  .replace(/<[^>]+>/g, "")        // remove HTML tags
                                  .replace(/\s+/g, " ")           // normalize all whitespace
                                  .replace(/&nbsp;/g, " ")        // handle HTML non-breaking spaces
                                  .trim();

                                // Match only word-like tokens (letters/numbers)
                                const words = cleanExcerpt.match(/\b[\w’'-]+\b/g) || [];

                                const shortExcerpt =
                                  words.length > 12
                                    ? words.slice(0, 12).join(" ") + "..."
                                    : cleanExcerpt;
                                    return `<div style="color:#555;margin-bottom:0px;opacity:.7;font-size:14px;line-height:1.5em;">
                                              ${shortExcerpt}
                                            </div>`;
                                  })()
                                : ""
                            }

                          </td>
                          <td valign="top" style="width:30%;position: relative;">
                          <!-- Image -->

                          ${
                        p.imageUrl
                          ? `<div style="box-sizing: border-box;min-width: 30%;flex-grow: 1;position: absolute;height: 100%;width: 100%;min-height: 140px;">
                              <img src="${p.imageUrl}" alt="${p.title}" width="180" height="140" style="display: block;object-fit: cover;position: absolute;height: 100%;width: 100%;inset: 0px;color: transparent;border-radius: 0 4px 4px 0;">
                            </div>`
                          : ""
                      }
                          </td>
                        </tr>
                      </table>

                    </a>
                  </td>
                </tr>
              </table>
        `
        )
        .join("")}            </td>
          </tr>
    `: "";

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${post.title}</title>
      <style>
      ul{
          margin: 0 0 1.5em 0;
          line-height: 1.6em;
          padding-left: 1.3em;
          padding-right: 1.5em;
          list-style: disc;
          max-width: 100%;
      }

      li{
        margin: 0.5em 0;
        padding-left: 0.3em;
        line-height: 1.6em;
        color: #15212a;
        font-size: 17px;
      }

      code{
        font-size: 0.9em;
        background: #f2f7fa;
        word-break: break-all;
        padding: 1px 7px;
        border-radius: 3px;
        color: #ffbd59;
      }
      </style>
    </head>
    <body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,Roboto,Helvetica,Arial,sans-serif;font-size:18px;line-height:0;color:#15212a;background-color:#ffffff;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
        <tr><td align="center">
          <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto;padding: 20px 20px 0;max-width: 600px;width: 100%;box-sizing: border-box;">

            <!-- Header -->
            ${showPublicationIcon ? `
              <tr style="text-align: center;">
                <td>
                <a href="${baseUrl}" style="text-decoration:none;">
                  <img 
                    src="${siteSettings?.siteLogoUrl}" 
                    alt="${siteSettings?.siteTitle}" 
                    style="width: 44px;height: 44px;border-radius: 3px;margin:0 0 8px 0;" 
                  />
                  </a>
                </td>
              </tr>
            ` : ''}
            <tr><td style="text-align:center;margin-bottom:40px;">
              
              ${post.title && showPostTitle ? `<h1 style="text-decoration:none;display:block;margin-top:38px;text-align:center;line-height:1.1em;color:#000000;margin-bottom: 0;">${post.title}</h1>` : ''}

              ${post.excerpt && showPostExcerpt ? `<p style="margin: 8px 0 0 0;color:#15212a;font-size: 19px;line-height: 1.4em;text-align: center;">${post.excerpt}</p>` : ''}
              
              <!-- Authors -->
              <div style="padding-top: 28px;">
                ${authors.length > 0  ? `
                  ${authors.map((author: any) => `
                  <p style="margin: 0 0 0 0;color:#0009;font-size: 13px;line-height: 20px;text-align: center;padding-bottom: 0;">By ${author.name} • ${formattedDate}</p>
                  `).join('')}
              ` : '' }
              <p style="margin: 0 0 0 0;color:#0009;font-size: 13px;line-height: 20px;text-align: center;padding-bottom: 0;">
                <a href="${baseUrl}/${post.slug}" style="color:inherit;text-decoration:underline;">View in browser</a>
              </p>
                </div>
              ${post.imageUrl && showFeatureImage ? `
                <img src="${urlFor(post.imageUrl).url()}" alt="${post.image?.altText || post.title || ''}" style="width:100%;height:auto;border-radius:6px;margin:30px 0 30px 0;">` : ''}
            </td></tr>

            <!-- Body -->
            <tr><td padding="30px 0 0px 0;">${portableTextContent}</td></tr>

            ${showLatestPostsSection ? `
            <tr><td>${latestPostsSection}</td></tr>
            ` : ''}

            <!-- Footer -->
            <tr><td align="center" style="padding-top: 40px;padding-bottom: 30px;border-top:1px solid #e6e6e6;">
            ${footerText ? `<p style="color:#0009;font-size:13px;margin:0;padding:10px 30px;">${footerText}</p>` : ''}
            <p style="color:#0009;font-size:13px;margin:0;padding:10px 30px;">
               ${siteSettings?.footerCopyright || ''} - <a href="${baseUrl}" style="color:#0009;text-decoration:underline;">Unsubscribe</a>
              </p>
            </td></tr>

          </table>
        </td></tr>
      </table>
    </body>
    </html>
  `;
}

export function generateEmailText({ result }: { result: any }): string {
  const {post, siteSettings} = result;
  const createdAt = new Date(post._createdAt);
  const formattedDate = createdAt.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const plainText = post.pageBuilder
    ?.map((block: any) =>
      block.children?.map((child: any) => child.text).join(" ")
    )
    .join(" ") || "";

  const words = plainText.split(/\s+/).length;
  const minutesToRead = Math.max(1, Math.ceil(words / 200));

  const tags = post.tag?.filter((tag: any) => !!tag?.title) || [];
  const tagList = tags.map((tag: any) => tag.title).join(', ');

  const authors = post.author || [];
  const authorNames = authors.map((author: any) => author.name).join(', ');

  return `${post.title || 'New Post'}

Published: ${formattedDate}
Read time: ${minutesToRead} min
${tagList ? `Tags: ${tagList}` : ''}

${post.excerpt || ''}

${plainText}

${authorNames ? `Published by: ${authorNames}` : ''}

Best regards,
${process.env.SENDGRID_FROM_NAME || 'Newsletter Team'}
  `.trim();
}

import Link from "next/link";

export function BlogShortcuts() {
  const blogs = [
    {
       title: "How Spin is Defining the New Powerplay Era",
       summary: "A deep dive into why captains are turning to mystery spin earlier than ever in the 2024 season.",
       date: "March 28, 2024",
       readTime: "6 min read"
    },
    {
       title: "The Death Over Blueprint",
       summary: "Analyzing the most effective bowling combinations for the final 4 overs across global T20 leagues.",
       date: "March 25, 2024",
       readTime: "8 min read"
    }
  ];

  return (
    <section className="blog-shortcuts content-grid" style={{ marginTop: "40px" }}>
      <div className="surface-span-12">
        <div className="surface-header">
           <div>
              <p className="kicker">PitchIQ Editorial</p>
              <h2>Latest Match Reports & Insights</h2>
           </div>
        </div>
        
        <div className="story-grid" style={{ marginTop: "20px" }}>
          {blogs.map((blog, i) => (
            <article key={i} className="story-card">
               <p className="kicker" style={{ fontSize: "0.7rem" }}>{blog.date} · {blog.readTime}</p>
               <h3>{blog.title}</h3>
               <p>{blog.summary}</p>
               <Link href="/" className="text-link" style={{ marginTop: "12px", display: "inline-block" }}>
                  Read full analysis →
               </Link>
            </article>
          ))}
        </div>
      </div>

    </section>
  );
}

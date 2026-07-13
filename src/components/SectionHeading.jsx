export function SectionHeading({ eyebrow, title, description, action, id }) {
  return (
    <div className="section-heading">
      <div>
        <span className="section-heading__eyebrow">{eyebrow}</span>
        <h2 id={id}>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

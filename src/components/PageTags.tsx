import {Tag} from 'antd';
import {useNavigate} from 'react-router-dom';
import type {WebSiteSubject} from '../models';
import {tagColor} from '../tools';

interface PageTagsProps {
    subjects?: WebSiteSubject[];
}

const displayName = (subject: WebSiteSubject): string =>
        subject.subject
        ?? subject.subject_en
        ?? subject.subject_fi
        ?? subject.subject_se
        ?? subject.subject_de
        ?? subject.subject_es
        ?? `Subject #${subject.id}`;

/**
 * The tags of a page as colored Ant Design tags shown next to the page title; each tag keeps its own color across pages and opens the subject search.
 */
export function PageTags({subjects = []}: PageTagsProps) {
    const navigate = useNavigate();

    if (subjects.length === 0) {
        return null;
    }

    return (
            <span className="page-tags" aria-label="Page tags" style={{display: 'inline-flex', flexWrap: 'wrap', gap: 4, verticalAlign: 'middle'}}>
                {subjects.map((subject) => {
                    const name = displayName(subject);
                    return (
                            <Tag
                                    key={subject.id}
                                    color={tagColor(name)}
                                    data-testid={`page-tag-${subject.id}`}
                                    style={{margin: 0, cursor: 'pointer'}}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        navigate(`/search?subjects=${encodeURIComponent(String(subject.id))}`);
                                    }}
                            >
                                {name}
                            </Tag>
                    );
                })}
            </span>
    );
}
